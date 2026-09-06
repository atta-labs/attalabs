/**
 * The complete FLIP loop — this is the whole mechanism, nothing omitted.
 *
 * Ported from the Principal-supplied topbar-lockup handoff (a design document handed over at
 * dispatch and never committed — the task's standing rule for design handoffs). Its rule is
 * restated in `../hero-lockup-context.tsx`; the maths is inlined below, final and complete —
 * this file adds only the surrounding rAF plumbing (bind, guard, cleanup). No third source.
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

/**
 * Tuned constants. Each is a design decision against the approved Claude Design reference
 * (the handoff's own values where unchanged, adjusted with the Principal where noted), not a
 * derivation — the comment on each names the constraint it encodes.
 */
export const FLIP = {
  // Hero-state scale of the topbar lockup. The handoff specified 4.8; lowered because the
  // harness is drawn on a WebGL canvas whose screen position follows the hero's ASPECT RATIO
  // (hero-scene.js's camera), not a DOM box this loop can measure against, so one value has
  // to leave clearance above the harness on wide/short and narrow/tall viewports alike.
  // Measured descriptor-to-harness clearance at 3.6, hero box constrained to each size:
  // 390×844 ≈ 68px, 320×800 ≈ 57px, 375×667 ≈ 20px — the short-viewport end is the tight
  // one, since the harness rides up as the box gets shorter. Below ~667px tall, expect it
  // to close further; a viewport-aware scale would be the fix if that ever matters.
  HERO_SCALE: 3.6,
  // Hero anchor as a fraction of viewport height. Deliberately small so the
  // TOPBAR_CLEARANCE_PX floor below governs on every realistic viewport: a floor read from
  // the topbar's live height does not drift with aspect ratio, a proportional fraction does.
  HERO_Y: 0.02,
  TOPBAR_CLEARANCE_PX: 24, // minimum gap below the topbar's live bottom edge
  TRAVEL_END: 0.42, // transform is exactly `none` from here on
  // Descriptor counter-scale at hero size. The handoff's 0.34 read too small next to the
  // word at hero scale; 0.5 against HeroLockup.tsx's `text-sm` rest size is the approved
  // hero-scale size — the two values must be read together.
  DESC_HERO: 0.5,
  MARK_IN: [0.3, 0.44],
  // rem — the word↔desc gap while bare. Zero at the true giant hero state, growing with `q`
  // to exactly `gap-1`'s value by the moment `docked` flips, so the docked layout takes over
  // with no visible jump. A single fixed value is wrong at one end or the other: the bare
  // phase spans everything from giant to nearly-docked with no binary line between them, so
  // the gap has to ride the same continuous `q` the scale rides.
  BARE_GAP_MAX: 0.25,
  // rem — must equal HeroLockup.tsx's `w-[2.75rem]`/`h-[2.75rem]` rest-state classes: this
  // loop drives that same span's width toward MARK_MAX, so a mismatch pops the mark's size on
  // the loop's first frame.
  MARK_MAX: 2.75
  // No separate chrome-fade window: `docked` (below) is `p >= TRAVEL_END`, the same condition
  // that settles `s` to 1. Any independently-tuned window disagrees with TRAVEL_END for some
  // scroll range by construction — either the docked layout turns on while `s` is still > 1,
  // or the reverse — so the two states must flip in the same frame.
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
