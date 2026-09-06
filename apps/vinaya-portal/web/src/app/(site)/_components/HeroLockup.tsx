'use client'

import { useHeroLockupRegister } from './hero-lockup-context'

/**
 * Splits `text` into one `<span data-letter>` per character, each with its own
 * `transitionDelay` — the same per-letter stagger idiom `hero-scene.js` uses for the
 * headline (`splitLetters`/`revealLetters`), but time-based here rather than
 * scroll-based, and gated the same way the mark already is: visible immediately by
 * default (every non-landing page renders the wordmark at rest, fully visible, with no
 * JS dependency — that guarantee must survive this), hidden only under the `data-bare`
 * ancestor attribute that's `'true'` on landing alone. `VinayaHeroEmblem.tsx`'s existing
 * reveal callback (see its own comment) flips each letter to visible in a staggered
 * cascade — no new scroll-progress hookup in `lockup-flip.js` needed.
 */
function Letters({ text, delayStep }: { text: string; delayStep: number }) {
  return [...text].map((ch, i) => (
    <span
      key={i}
      data-letter
      className='inline-block translate-y-0 opacity-100 transition-[opacity,transform] duration-500 ease-out [[data-bare=true]_&]:translate-y-0.5 [[data-bare=true]_&]:opacity-0'
      style={{ transitionDelay: `${i * delayStep}ms` }}
    >
      {ch === ' ' ? ' ' : ch}
    </span>
  ))
}

/**
 * The topbar's wordmark, and the ONLY wordmark in the DOM — per TOPBAR-LOCKUP.md, the
 * landing hero renders no wordmark of its own, it only writes a `transform` onto this
 * node (see `hero-canvas/lockup-flip.js`). Resting size is the bar's real size; the hero
 * state is this same element scaled up (`FLIP.HERO_SCALE` in `lockup-flip.js`) and
 * centred, not a second copy.
 *
 * The mark is the CMS-driven brand image (`branding.logoSolidDark/Light`) — the same
 * asset `Logo` renders today — never the static `VinayaMark` SVG (that's a resting-only
 * silhouette used elsewhere, not "the logo").
 *
 * The mark's slot starts shut (`width: 0`) only on the landing page, and only for the
 * cold-open's first ~third of the scroll — driven imperatively by the hero's
 * `attachLockupFlip` loop (`mark.style.width`), which fully owns the value from its first
 * frame onward. Below is a CSS fallback for the gap before that loop's effect runs on
 * mount: keyed off the same `data-bare` ancestor attribute `TopBarChromeHost` already sets
 * (SSR-correct per route — `'true'` only on landing), so it introduces no new data
 * attribute and no new "who owns this" question — the loop still only ever writes
 * `data-bare`, same as the ChromeFrame border/background it also gates. Without it, a real
 * flash of the small resting logo (and full bordered chrome) painted before the loop
 * attached, on every landing load. Every other page renders this at rest, fully visible,
 * `data-bare` there is always `'false'`.
 *
 * The lockup root itself carries the same `[[data-bare=true]_&]:opacity-0` fallback, for a
 * DIFFERENT gap than the mark's: even with the FLIP loop's `import` now static (see
 * `VinayaHeroEmblem.tsx`), its effect still runs one paint after the browser's first paint
 * of the un-transformed DOM — a real, visible instant of the small, natural-position
 * wordmark before it snaps to hero scale, reported live. Hiding the whole lockup by default
 * on landing and revealing it only once that first frame has computed a transform (the
 * `requestAnimationFrame` callback in `VinayaHeroEmblem.tsx`, scheduled right after the
 * loop attaches — same-frame ordering guarantees it runs after the loop's own first tick)
 * trades that flash for a single invisible frame instead.
 *
 * The mark's rem size (`2.75rem`) is shared with `hero-canvas/lockup-flip.js`'s
 * `MARK_MAX` — that file drives the SAME span's width via `mark.style.width` (opening it
 * 0 → target over the cold-open's `MARK_IN` window), so the rest-state class here and the
 * animated target there must agree or the mark would jump size the instant the loop's
 * first frame runs. Deliberately TALLER than the word+descriptor column (≈2.4rem): the
 * reference lockup's mark overshoots the text block on both edges rather than sitting
 * flush inside it — matching that height instead made the mark read as merely "contained,"
 * and made a sub-pixel `items-center` rounding difference (confirmed by measurement:
 * mark height 36px vs column height 38px, centers agreeing to within 1px) look like a
 * real misalignment it wasn't. Overshooting both ways removes that illusion entirely.
 *
 * Word/descriptor sizing matches the approved Claude Design mockup's own proportions —
 * `word` regular weight (not bold), `desc` sized close to HALF the word's cap height, not
 * a small caption line under it. An earlier pass made `word` bold and `desc` tiny
 * (`text-[0.625rem]`) chasing a DIFFERENT reference image; reported live as a real
 * regression against the actual approved design, not a matter of taste. `attachLockupFlip`'s
 * formulas measure these nodes live (`word.offsetWidth`, etc.) every frame, so any size
 * here is a free parameter, not a hardcoded assumption baked into the FLIP math elsewhere.
 *
 * `items-start` on the column wrapper is load-bearing, not decorative: a flex column's
 * default `align-items: stretch` stretches every child to the container's own (widest-child)
 * cross-axis width — confirmed live, `word` and `desc` reported the exact same
 * `getBoundingClientRect().width` despite different text and font sizes. The FLIP math
 * centers whatever box `getBoundingClientRect()` reports, correctly — but stretched, the
 * text (left-aligned by default inside its own box) sits in only part of that box, so the
 * box lands centered while the glyphs visibly don't. Invisible at the old, narrower font
 * sizes where natural widths nearly matched; a real, visible offset once the sizes grew
 * apart. `items-start` makes each child's box hug its own text again.
 *
 * `gap-0`/`[[data-bare=false]_&]:gap-1` on that same column is the THIRD mechanism tried
 * for the word↔desc spacing, replacing both an earlier `self-stretch`/`justify-between`
 * spread (stretched the column to the mark's own `2.75rem` height and distributed the two
 * lines to its top/bottom edges) and, before that, a bare-only negative margin. Both were
 * real regressions in different directions: `self-stretch` carried the mark's fixed
 * 2.75rem height into the hero-scale render too, where the transform's scale blew it up
 * into a huge gap; a `gap-2` floor added on top of the spread to fix a transition-tail
 * complaint instead inflated the PERMANENT docked gap on every page (there is no
 * code-level distinction between "just docked" and "docked and scrolled further" —
 * `data-bare` is a flat binary). A plain flex `gap`, with no stretch/distribute mechanic
 * at all, sidesteps that whole class of bug: `gap-0` while bare is exactly zero
 * regardless of the FLIP transform's current scale (0 × any scale is still 0 — the
 * amplification problem simply doesn't apply to zero), and `gap-1` while docked is a
 * fixed, unscaled rest value once `s` has settled to 1. Confirmed live via the actual
 * DOM (`data-bare="true"` in DevTools) — not another screenshot guess.
 *
 * The DOCKED topbar and the BARE hero show different text on the same two ref'd nodes —
 * "Vinaya" / "Git harness" while bare, "GIT" / "HARNESS" while docked (topbar-only,
 * requested live: the wordmark drops "Vinaya" once landed, HeroLockup keeps showing
 * "Vinaya" at hero scale). `word`/`desc` stay the single ref'd elements `attachLockupFlip`
 * measures and transforms; each wraps TWO content spans, CSS-grid-stacked into the same
 * cell (`grid` on the wrapper, `col-start-1 row-start-1` on both) rather than toggled via
 * `hidden`/`block` — a hard display swap can't transition, so the two texts popped
 * instantly instead of crossfading (reported live). Grid-stacking keeps both spans
 * genuinely in flow (no `position: absolute`, which is off the table here) so a plain
 * `opacity` transition crossfades them; the wrapper's own size (what `offsetWidth`/
 * `getBoundingClientRect()` report to the FLIP loop) becomes the LARGER of the two
 * overlapping texts rather than exactly whichever is visible — a minor, accepted
 * trade-off ("Vinaya" and "GIT" are close in width) for a soft transition instead of a pop.
 */
export function HeroLockup({ logoUrl, alt = 'Vinaya' }: { logoUrl?: string | null; alt?: string }) {
  const setNode = useHeroLockupRegister()

  return (
    <span
      ref={(el) => setNode('lockup', el)}
      className='inline-flex origin-top-left items-center gap-[0.3rem] leading-none will-change-transform [[data-bare=true]_&]:opacity-0'
    >
      {logoUrl && (
        <span
          ref={(el) => setNode('mark', el)}
          className='w-[2.75rem] shrink-0 overflow-hidden [[data-bare=true]_&]:w-0 [[data-bare=true]_&]:opacity-0'
        >
          {/* biome-ignore lint/performance/noImgElement: CMS-hosted brand asset, not a next/image-optimizable local file */}
          <img src={logoUrl} alt={alt} className='h-[2.75rem] w-auto dark:invert' />
        </span>
      )}
      <span className='flex flex-col items-start gap-0 [[data-bare=false]_&]:gap-1'>
        <span ref={(el) => setNode('word', el)} className='grid'>
          <span className='col-start-1 row-start-1 font-mono text-sm font-normal tracking-normal text-foreground opacity-100 transition-opacity duration-500 ease-out [[data-bare=false]_&]:opacity-0'>
            <Letters text='Vinaya' delayStep={40} />
          </span>
          <span className='col-start-1 row-start-1 font-mono text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground opacity-0 transition-opacity duration-500 ease-out [[data-bare=false]_&]:opacity-100'>
            <Letters text='GIT' delayStep={40} />
          </span>
        </span>
        <span ref={(el) => setNode('desc', el)} className='origin-left grid'>
          <span className='col-start-1 row-start-1 font-mono text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground opacity-100 transition-opacity duration-500 ease-out [[data-bare=false]_&]:opacity-0'>
            <Letters text='Git harness' delayStep={25} />
          </span>
          <span className='col-start-1 row-start-1 font-mono text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground opacity-0 transition-opacity duration-500 ease-out [[data-bare=false]_&]:opacity-100'>
            <Letters text='HARNESS' delayStep={25} />
          </span>
        </span>
      </span>
    </span>
  )
}
