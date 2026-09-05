'use client'

import { Button } from '@atta/ui/components'
import { VinayaMark } from '@atta/ui/footer/marks/vinaya'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowDown } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'

/* Class strings for the letters `hero-scene.js` splits into <i> tags — authored here so
   Tailwind's @source scan (which only reads .ts/.tsx) actually generates them; a class
   string literal inside the .js factory compiles to nothing. */
const LETTER_CLASS = { word: 'inline-block whitespace-nowrap', letter: 'inline-block not-italic' }

function EmblemInner({ landingActions }: { landingActions?: ReactNode }) {
  const isLanding = landingActions !== undefined
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={rootRef} className='relative h-full w-full'>
      <div data-hero-track className='relative h-[320vh] w-full'>
        <div data-hero-viewport className='sticky top-0 h-dvh w-full overflow-hidden bg-background'>
          <canvas ref={canvasRef} className='absolute inset-0 z-0 block h-full w-full' />

          {/* the centred wordmark — travels to the corner on scroll */}
          <div className='pointer-events-none absolute inset-x-0 top-[16%] z-2 text-center leading-none'>
            <span data-hero-lockup className='inline-flex flex-col items-center will-change-transform'>
              <span className='text-[clamp(2.25rem,5vw,3.75rem)] font-normal tracking-[-0.02em] text-foreground'>
                Vinaya
              </span>
              <span className='mt-1 font-mono text-base uppercase tracking-[0.3em] text-muted-foreground'>
                Git harness
              </span>
            </span>
          </div>

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
              <div
                data-hero-cta
                className='pointer-events-auto mt-7 flex flex-wrap items-center justify-center gap-4 opacity-0'
              >
                {landingActions}
              </div>
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
              <div data-hero-cta className='pointer-events-auto mt-7 opacity-0'>
                <Button
                  type='button'
                  size='lg'
                  onClick={() => document.getElementById('hero-classic')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  See how it works
                  <ArrowDown className='size-4' />
                </Button>
              </div>
            </div>
          )}

          {/* the header lockup it hands off to */}
          <div
            data-hero-corner
            className='pointer-events-none absolute left-7 top-6 z-4 flex items-center gap-[0.3rem] opacity-0'
          >
            <div data-hero-mark className='size-10 shrink-0 text-foreground'>
              <VinayaMark className='size-10' />
            </div>
            <span className='font-mono text-xs uppercase leading-tight tracking-[0.16em] text-foreground'>
              Git
              <br />
              harness
            </span>
          </div>

          {/* scroll cue, shown only once the build has finished */}
          <div
            data-hero-descend
            className='pointer-events-none absolute bottom-[clamp(1.5rem,5vh,3rem)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5 opacity-0 transition-opacity duration-600 ease-out'
          >
            <span className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>Scroll</span>
            <span className='flex flex-col items-center gap-[3px]'>
              <span className='block h-px w-[34px] bg-foreground' />
              <span className='block h-px w-[22px] bg-foreground/55' />
              <span className='block h-px w-[12px] bg-foreground/30' />
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
export function VinayaHeroEmblem({ landingActions }: { landingActions?: ReactNode }) {
  return (
    <section id='hero' className='relative w-full bg-background'>
      <EmblemInner landingActions={landingActions} />
    </section>
  )
}
