/**
 * The complete FLIP loop — this is the whole mechanism, nothing omitted.
 *
 * Ported verbatim from the approved handoff (TOPBAR-LOCKUP.md + implementation/lockup-flip.js).
 * The inlined maths IS final and complete — this file is only the surrounding rAF plumbing
 * (bind, guard, cleanup). There is no third source.
 *
 * Call once from the hero, after the topbar has registered its lockup node.
 *
 *   const stop = attachLockupFlip({ hero, lockup, word, desc, mark, bar })
 *   // …on unmount: stop()
 *
 * `hero` must be the sticky viewport element; its parent is the scroll track.
 * All six nodes are the topbar's / hero's real DOM nodes. Nothing is created here.
 */

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export const FLIP = {
  HERO_SCALE: 3.6, // lowered from the handoff's 4.8, then 4, then 3.2 — the harness is
  // drawn on a WebGL canvas, not a DOM box, so nothing here (Tailwind or JS) can measure or
  // react to where it actually sits; its screen position comes from hero-scene.js's camera
  // and shifts with the hero's ASPECT RATIO, not just its height. Reported live on a
  // narrow/tall viewport: the descriptor line was nearly touching the harness's top edge
  // despite comfortable clearance on a wide/short one. 3.2 was a safe but visibly
  // undersized compromise against the approved Claude Design reference — 3.6 is a
  // deliberate middle point, verified with real clearance on a wide/short viewport; a
  // narrow/tall one could not be reproduced in this environment (`resize_window` doesn't
  // actually change the viewport here) and needs a live check.
  HERO_Y: 0.02, // hero anchor, fraction of viewport height. Deliberately small enough that
  // `TOPBAR_CLEARANCE_PX`'s floor (below) governs the word's vertical position on
  // virtually every realistic viewport — an explicit, topbar-anchored position that does
  // NOT drift with aspect ratio, is worth more here than a proportional fraction tuned to
  // one specific screenshot at a time (0.2, 0.115, and 0.08 were each tried and each
  // failed on a DIFFERENT aspect ratio or viewport height — see git history on this file).
  TOPBAR_CLEARANCE_PX: 24, // minimum gap below the topbar's live bottom edge
  TRAVEL_END: 0.42, // transform is exactly `none` from here on
  DESC_HERO: 0.5, // descriptor counter-scale at hero size — raised from the handoff's
  // 0.34, which read as too small next to the word at hero scale (reported live). A
  // 0.583 compensated value existed briefly while `HeroLockup.tsx`'s `desc` rest size was
  // `text-xs`; that rest size reverted back to `text-sm` to match `word`, so this reverts
  // with it (0.875rem×0.5 is the hero-scale size that was actually approved).
  MARK_IN: [0.3, 0.44],
  BARE_GAP_MAX: 0.25, // rem — the word↔desc gap while bare grows from 0 at the true giant
  // hero state up to this value as `q` (this same file's scroll-progress easing) approaches
  // 1, rather than sitting at a single fixed value the whole time bare is true. `gap-0` in
  // HeroLockup.tsx was correct for the ACTUAL giant hero state (reported live, confirmed
  // via DevTools) but the SAME zero value also covered the tail of the dock transition,
  // where the lockup has already shrunk to near its final small size while still bare —
  // at that size, zero gap reads as visibly too tight (reported live, separately from the
  // giant-state complaint). There is no clean binary line between "giant" and "about to
  // dock" — it's the same continuous `q` the scale itself rides — so the gap needs to
  // ride it too, not sit on one fixed value for the whole bare phase. `0.25` matches
  // `gap-1`'s rem value, so the gap arrives at exactly the docked value by the moment
  // `docked` flips (`q` reaches 1 at the same `p = TRAVEL_END` `docked` does) — no visible
  // jump at the handoff.
  MARK_MAX: 2.75 // rem — raised from the handoff's 1.35; must match HeroLockup.tsx's own
  // `w-[2.75rem]`/`h-[2.75rem]` rest-state classes or the mark jumps size the instant this
  // loop's first frame runs (reported live, a real visible pop).
  // No CHROME_IN range: `docked` below is a hard `p >= TRAVEL_END` cutover, not a smoothed
  // threshold with its own tunable window. A smoothed range (the handoff's [0.3, 0.46],
  // then a shifted [0.44, 0.52]) is a SEPARATE window from `TRAVEL_END` by construction,
  // and whichever side of `TRAVEL_END` it sits on, `s` and the dock state disagree for a
  // stretch — either `s` still >1 while the spread layout has already turned on (renders
  // bigger than its resting size, then snaps down), or the reverse (size/position already
  // fully settled while the spacing and "GIT"/"HARNESS" text are still the bare state's) —
  // both reported live, in that order, from tuning the range instead of removing it.
  // Deriving `docked` from `TRAVEL_END` itself makes `s` and the dock state change in the
  // same frame, always — no window left for them to disagree in either direction.
}

export function attachLockupFlip({ hero, lockup, word, desc, mark, bar }) {
  let raf = 0

  const frame = () => {
    raf = requestAnimationFrame(frame)
    if (!hero || !lockup || !hero.isConnected) return

    const tr = hero.parentElement.getBoundingClientRect()
    const travel = tr.height - hero.clientHeight
    const p = travel <= 20 ? 0 : clamp01(-tr.top / travel)
    const q = easeInOut(clamp01(p / FLIP.TRAVEL_END))

    /* TRAP 1 — measure with the transform cleared, in the same frame we write the new one.
       Measuring the animated rect feeds back into itself and drifts. */
    lockup.style.transform = 'none'
    const rest = lockup.getBoundingClientRect()
    const hr = hero.getBoundingClientRect()
    const restX = rest.left - hr.left
    const restY = rest.top - hr.top

    const s = 1 + (FLIP.HERO_SCALE - 1) * (1 - q)
    const wordW = word.offsetWidth

    /* TRAP 2 — centre on the WORD, not the lockup. The mark's slot collapses to width 0 over
       the hero but the lockup's flex gap survives, and the gap is multiplied by the scale
       (0.3rem × 4.8 ≈ 26px of drift). Deriving from the word's own untransformed left is
       robust to any mark width or fade window. */
    const wordLead = word.getBoundingClientRect().left - hr.left - restX
    const tx = (hr.width / 2 - (wordW * s) / 2 - restX - wordLead * s) * (1 - q)

    /* Floor against the topbar's OWN live height, not the fraction below — see FLIP.HERO_Y's
       comment for why a viewport-height fraction alone can't be trusted to clear a
       fixed-height element on a short window. */
    const tyProportional = hr.height * FLIP.HERO_Y - restY
    const tyFloor = bar
      ? bar.getBoundingClientRect().bottom + FLIP.TOPBAR_CLEARANCE_PX - hr.top - restY
      : tyProportional
    const ty = Math.max(tyProportional, tyFloor) * (1 - q)
    lockup.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`

    /* TRAP 3 — the descriptor cannot ride a uniform scale: the bar's word:descriptor ratio is
       ~2.3 and the hero wants ~7. It carries its own counter-scale, which also lands at 1. */
    if (desc) {
      const c = FLIP.DESC_HERO + (1 - FLIP.DESC_HERO) * q
      const off = ((wordW - desc.offsetWidth * c) / 2) * (1 - q)
      desc.style.transform = `translateX(${off.toFixed(2)}px) scale(${c.toFixed(4)})`
      /* Grows from 0 (giant hero) toward FLIP.BARE_GAP_MAX (tail of the dock transition) as
         q→1 — see FLIP.BARE_GAP_MAX's own comment. Cleared to 0 once docked so it never
         adds on top of HeroLockup.tsx's own `gap-1`, which owns the docked spacing alone. */
      desc.style.marginTop = p >= FLIP.TRAVEL_END ? '0px' : `${(q * FLIP.BARE_GAP_MAX).toFixed(3)}rem`
    }

    /* the 3D harness IS the Vinaya mark, so the mark's slot stays shut while the harness is on
       screen and opens only as the lockup lands — one element appearing inside the group,
       never a group swap */
    if (mark) {
      const mk = smooth(FLIP.MARK_IN[0], FLIP.MARK_IN[1], p)
      mark.style.width = `${(FLIP.MARK_MAX * mk).toFixed(3)}rem`
      mark.style.opacity = mk.toFixed(3)
    }

    /* the bar's own chrome — the ONLY two properties that change on the shared component.
       Tied to the exact same condition that makes `s` settle to 1, not a separately-tuned
       threshold — see FLIP's own comment for why that separation was the actual bug. */
    if (bar) {
      const docked = p >= FLIP.TRAVEL_END
      bar.dataset.bare = docked ? 'false' : 'true'
    }
  }

  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

/** prefers-reduced-motion: jump straight to docked and never start the loop. */
export function dockImmediately({ lockup, desc, mark, bar }) {
  lockup.style.transform = 'none'
  if (desc) desc.style.transform = 'none'
  if (mark) {
    mark.style.width = `${FLIP.MARK_MAX}rem`
    mark.style.opacity = '1'
  }
  if (bar) bar.dataset.bare = 'false'
}
