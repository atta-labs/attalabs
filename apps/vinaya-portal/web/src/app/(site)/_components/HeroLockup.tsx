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
 * The topbar's wordmark, and the ONLY wordmark in the DOM — the landing hero renders no
 * wordmark of its own, it only writes a `transform` onto this node (see
 * `hero-canvas/lockup-flip.js`; the rule itself is stated in `hero-lockup-context.tsx`).
 * Resting size is the bar's real size; the hero state is this same element scaled up
 * (`FLIP.HERO_SCALE`) and centred, not a second copy.
 *
 * The mark is the CMS-driven brand image (`branding.logoSolidDark/Light`) — the same asset
 * `Logo` renders — never the static `VinayaMark` SVG (a resting-only silhouette used
 * elsewhere, not "the logo").
 *
 * Two `[[data-bare=true]_&]` CSS fallbacks cover the gap between first paint and the FLIP
 * loop's first frame, keyed off the same `data-bare` attribute `TopBarChromeHost` already
 * SSRs per route (`'true'` on landing alone, so every other page renders this at rest,
 * fully visible, with no JS dependency):
 * - the mark's slot starts shut (`w-0 opacity-0`) — the loop owns `mark.style.width` from
 *   its first frame on, opening it over `FLIP.MARK_IN`;
 * - the whole lockup starts at `opacity-0` — the effect that attaches the loop runs one
 *   paint after the browser's first paint of the un-transformed DOM, which would otherwise
 *   flash the small, natural-position wordmark before it snaps to hero scale.
 *   `VinayaHeroEmblem.tsx` reveals it from a `requestAnimationFrame` scheduled right after
 *   the loop attaches, so opacity turns on only once a transform has been computed.
 *
 * Sizing constraints the FLIP loop depends on:
 * - the mark's `2.75rem` must equal `lockup-flip.js`'s `MARK_MAX` (that file animates this
 *   same span's width toward it; a mismatch pops the mark's size on the loop's first
 *   frame). It is deliberately taller than the word+descriptor column (≈2.4rem): the
 *   reference lockup's mark overshoots the text block on both edges, and matching the
 *   column height instead makes a sub-pixel `items-center` rounding difference read as
 *   misalignment.
 * - `word` is regular weight and `desc` sits close to half the word's cap height, matching
 *   the approved reference's proportions. The loop measures both live (`offsetWidth`,
 *   `getBoundingClientRect()`), so these sizes are free parameters, not assumptions baked
 *   into the maths.
 * - `items-start` on the column is load-bearing: a flex column's default `align-items:
 *   stretch` gives `word` and `desc` the same (widest-child) box width, and the loop
 *   centres the box — left-aligned glyphs inside a stretched box land visibly off-centre.
 * - `gap-0` while bare, `gap-1` while docked: a plain flex gap has no stretch/distribute
 *   mechanic for the transform's scale to amplify (0 × any scale is 0), and the docked
 *   value is a fixed rest value once `s` has settled to 1. The bare-phase gap is animated
 *   continuously by the loop (`desc.style.marginTop`, see `FLIP.BARE_GAP_MAX`) rather than
 *   through a second CSS value.
 *
 * The docked topbar and the bare hero show different text on the same two ref'd nodes —
 * "Vinaya" / "Git harness" while bare, "GIT" / "HARNESS" while docked (a topbar-only
 * wordmark change). Each ref'd node wraps TWO content spans, CSS-grid-stacked into the same
 * cell (`grid` on the wrapper, `col-start-1 row-start-1` on both) rather than toggled via
 * `hidden`/`block`: a display swap can't transition, so the texts would pop instead of
 * crossfading. Grid-stacking keeps both genuinely in flow (no `position: absolute`) so a
 * plain `opacity` transition crossfades them; the wrapper's measured size becomes the
 * LARGER of the two texts — an accepted trade-off, "Vinaya" and "GIT" are close in width.
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
