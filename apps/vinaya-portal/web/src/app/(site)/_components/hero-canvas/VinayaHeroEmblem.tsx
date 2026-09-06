'use client'

import { Heading, Text } from '@atta/ui/shared'
import { type ReactNode, useEffect, useRef } from 'react'
import { useHeroLockupNodes } from '../hero-lockup-context'
import { attachLockupFlip, dockImmediately } from './lockup-flip'

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

  // Per TOPBAR-LOCKUP.md: the hero renders no wordmark of its own — it only writes a
  // `transform` onto the topbar's real lockup node. `getLockupNodes()` reads a plain
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
  // Even so, this effect still runs one paint after the browser's first paint of the
  // un-transformed DOM — `HeroLockup.tsx` hides the whole lockup by default on landing
  // (`[[data-bare=true]_&]:opacity-0`) for exactly that gap, and the `requestAnimationFrame`
  // below reveals it. Scheduled right after `attachLockupFlip` attaches its own rAF loop,
  // it runs strictly after that loop's first tick (callbacks fire in request order) — so
  // opacity only turns on once a transform has actually been computed, never before.
  //
  // The per-letter cascade (`HeroLockup.tsx`'s `Letters`) is revealed from the SAME
  // callback: each letter already carries its own CSS `transitionDelay`, so flipping them
  // all to visible in one pass here is enough to produce the staggered letter-by-letter
  // reveal — no per-letter timing logic needed on this side.
  useEffect(() => {
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
      return
    }
    const stop = attachLockupFlip({ hero, lockup, word, desc, mark, bar })
    const revealRaf = requestAnimationFrame(() => {
      lockup.style.opacity = '1'
      revealLetters()
    })
    return () => {
      stop()
      cancelAnimationFrame(revealRaf)
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
