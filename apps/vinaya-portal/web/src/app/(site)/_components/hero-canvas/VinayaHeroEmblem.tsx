'use client'

import './hero-core.css'

import { Heading, Text } from '@atta/ui/shared'
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import { useHeroLockupNodes } from '../hero-lockup-context'
import { attachLockupFlip, dockImmediately, resetLockup } from './lockup-flip'

/* Class strings for the letters `hero-scene.js` splits into <i> tags — authored here so
   Tailwind's @source scan (which only reads .ts/.tsx) actually generates them; a class
   string literal inside the .js factory compiles to nothing. */
const LETTER_CLASS = { word: 'inline-block whitespace-nowrap', letter: 'inline-block not-italic' }

function EmblemInner({ landingActions }: { landingActions?: ReactNode }) {
  const isLanding = landingActions !== undefined
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const heroViewportRef = useRef<HTMLDivElement>(null)
  const getLockupNodes = useHeroLockupNodes()

  // Mounts the ported Claude Design scene from a dynamic import so `three` stays out of
  // the SSR module graph (the `/life-cycle` precedent). `cancelled` guards the async
  // import racing an unmount; App Router remounts on client navigation and React 18
  // StrictMode double-invokes effects in dev, so `dispose()` is mandatory, not defensive.
  useEffect(() => {
    let cancelled = false
    let scene: { dispose: () => void } | undefined
    import('./hero-scene').then(({ mountHeroScene }) => {
      if (cancelled || !canvasRef.current) return
      scene = mountHeroScene({
        canvas: canvasRef.current,
        root: rootRef.current,
        labelClass: LETTER_CLASS
      })
    })
    return () => {
      cancelled = true
      scene?.dispose()
    }
  }, [])

  // The hero renders no wordmark of its own — it only writes a `transform` onto the
  // topbar's real lockup node (the single-lockup rule, stated in `hero-lockup-context.tsx`). `getLockupNodes()` reads a plain
  // mutable object populated by callback refs during commit, so it's already correct by
  // the time this effect runs (no re-render/subscription needed).
  //
  // Statically imported, unlike `hero-scene.js` above: that dynamic import exists to keep
  // `three` out of the SSR module graph, a real cost this tiny DOM/math module doesn't
  // carry. A dynamic import here bought nothing but a load race — the giant, centered
  // hero-scale transform this effect applies only appears once its network+parse round
  // trip resolves, so a slow chunk load left the lockup visibly sitting at its tiny
  // natural topbar position (the "not centered" reports) until it resolved. A static
  // import runs synchronously on mount instead.
  //
  // A LAYOUT effect, not a passive one: `useEffect` runs after the browser has already
  // painted the committed DOM, so on a client navigation to landing (and on every commit
  // where nothing else hides it) the lockup got one painted frame at its small, natural
  // topbar position before this effect moved it — the load flash. `useLayoutEffect` runs
  // after commit but BEFORE paint, and `attachLockupFlip` writes its first frame
  // synchronously before returning (see its header comment), so by the time this effect
  // flips `opacity` on, the hero-scale transform is already on the node: the reveal is in
  // the same pre-paint task as the transform, with no rAF hop between them. On a hard
  // reload the SSR'd HTML is painted before any JS runs at all; that window is covered by
  // `HeroLockup.tsx`'s `[[data-bare=true]_&]:opacity-0` (the SSR'd `data-bare` is `'true'`
  // on landing), which this effect lifts only once the transform exists.
  //
  // The per-letter cascade (`HeroLockup.tsx`'s `Letters`) is revealed in the SAME
  // pass: each letter already carries its own CSS `transitionDelay`, so flipping them
  // all to visible at once is enough to produce the staggered letter-by-letter
  // reveal — no per-letter timing logic needed on this side.
  //
  // Cleanup has to UNDO, not just stop. The lockup nodes live in the persisted
  // `(site)/layout.tsx` topbar and outlive this component, so cancelling the rAF loop
  // leaves the last frame's inline `transform`/`opacity`/`marginTop`/`width` on them — a
  // frozen mid-animation fragment on whichever route was navigated to. `resetLockup`
  // clears every inline write back to the CSS rest state (see its own comment). It runs
  // from this layout effect's cleanup, i.e. synchronously inside the commit that unmounts
  // the hero, before the destination route paints, and before any later commit could
  // re-mount a hero — so a rapid nav away-and-back can't interleave a stale cleanup with
  // a fresh attach. The reduced-motion branch writes the same nodes (`dockImmediately`),
  // so it gets the same cleanup.
  useLayoutEffect(() => {
    const { lockup, word, desc, mark, bar } = getLockupNodes()
    const hero = heroViewportRef.current
    if (!hero || !lockup || !word) return

    const revealLetters = () => {
      for (const el of lockup.querySelectorAll<HTMLElement>('[data-letter]')) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      dockImmediately({ lockup, desc, mark, bar })
      lockup.style.opacity = '1'
      revealLetters()
      return () => resetLockup({ lockup, word, desc, mark, bar })
    }
    const stop = attachLockupFlip({ hero, lockup, word, desc, mark, bar })
    lockup.style.opacity = '1'
    revealLetters()
    return () => {
      stop()
      resetLockup({ lockup, word, desc, mark, bar })
    }
  }, [getLockupNodes])

  return (
    <div ref={rootRef} className='relative h-full w-full'>
      <div data-hero-track className='relative h-[320vh] w-full'>
        <div
          ref={heroViewportRef}
          data-hero-viewport
          className='sticky top-0 h-dvh w-full overflow-hidden bg-background'
        >
          {/* translate-y is a pure post-render visual nudge — it doesn't touch hero-scene.js's
              own resize/aspect math (still sized off this div's untranslated box), so the
              harness's own camera framing stays exactly as authored; this just shifts the
              already-rendered image down a bit within the (overflow-hidden) viewport, per
              live feedback that it read too close to the wordmark above it. */}
          <canvas ref={canvasRef} className='absolute inset-0 z-0 block h-full w-full translate-y-12' />

          {/* title + sub: hidden at scroll 0, revealed a line at a time */}
          {isLanding ? (
            <div className='pointer-events-none absolute inset-x-0 top-0 z-2 flex h-[52%] flex-col items-center justify-center gap-2 px-6 text-center'>
              <Heading
                level={1}
                weight='normal'
                className='m-0 text-balance font-serif text-[clamp(1.875rem,5.4vw,4rem)] leading-none tracking-tight text-foreground'
              >
                <span data-hero-h1a data-text='Agents write code' />
                <br />
                <span data-hero-h1b data-text='Vinaya ships software' />
              </Heading>
              <Text className='m-0 mt-3.5 text-balance font-sans text-[clamp(0.9375rem,1.7vw,1.375rem)] leading-normal text-muted-foreground'>
                <span data-hero-sub data-text='Your agent moves fast. Vinaya holds the line.' />
              </Text>
            </div>
          ) : (
            <div className='pointer-events-none absolute inset-x-0 top-0 z-2 flex h-[52%] flex-col items-center justify-center gap-2 px-6 text-center'>
              <Heading
                level={1}
                className='m-0 text-balance font-sans text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl'
              >
                Sustainable software development
                <br />
                for the <span className='rounded-lg bg-accent px-3'>AI era</span>.
              </Heading>
              <Text className='m-0 text-balance font-sans text-lg leading-relaxed text-muted-foreground'>
                A harness for your software engineering process
              </Text>
            </div>
          )}

          {/* scroll cue, shown only once the build has finished */}
          <div
            data-hero-descend
            className='pointer-events-none absolute bottom-[clamp(1.5rem,5vh,3rem)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5 opacity-0 transition-opacity duration-600 ease-out'
          >
            <span className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>Scroll</span>
            <span className='flex flex-col items-center gap-[0.1667rem]'>
              <span className='block h-px w-[1.8889rem] bg-foreground' />
              <span className='block h-px w-[1.2222rem] bg-foreground/55' />
              <span className='block h-px w-[0.6667rem] bg-foreground/30' />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Outer — a normal in-flow section (NOT a fixed overlay), so it scrolls away like every
// other section: the page is a flat stack. Its height now follows the sticky scroll
// track inside it rather than a fixed viewport height. No `overflow-hidden` here: that
// would make this section itself an intervening scroll container for the inner sticky
// viewport (CSS gives every `overflow` value but `visible` a scrollport), which breaks
// `position: sticky` — the viewport's own `overflow-hidden` clips the canvas instead.
// `SiteContentPad` (`(site)/_components/SiteContentPad.tsx`) skips its `pt-14` on the
// landing route specifically so this section starts at the true page top, y=0 — the
// canvas paints under the fixed, transparent TopBarChromeHost.
export function VinayaHeroEmblem({ landingActions }: { landingActions?: ReactNode }) {
  return (
    <section id='hero' className='relative w-full bg-background'>
      <EmblemInner landingActions={landingActions} />
    </section>
  )
}
