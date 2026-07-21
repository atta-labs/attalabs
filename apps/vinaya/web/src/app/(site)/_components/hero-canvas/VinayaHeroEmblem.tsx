'use client'

import { Button } from '@atta/ui/components'
import { Heading } from '@atta/ui/shared'
import { ArrowDown, GitBranch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { HarnessStructure } from './HarnessStructure'
import { HeroFabric } from './HeroFabric'

// True while the hero is on screen. Drives replaying the build whenever the hero
// re-enters view (scroll back, or navigate away and return).
function useIsInView(ref: React.RefObject<HTMLElement | null>) {
  // Start true so the hero shows + animates on mount even before the observer's first
  // callback; the observer then only drives the scroll-away / re-enter transitions.
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return inView
}

// Ring px scales with the viewport but caps so slogan + emblem fit one screen.
function useResponsiveRing() {
  const [ringSize, setRingSize] = useState(400)
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      setRingSize(Math.round(Math.min(440, vw * 0.78, vh * 0.56)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return ringSize
}

// The harness center — the protected `main` branch.
function MainBranchNode({ size }: { size: number }) {
  return (
    <svg
      viewBox='0 0 100 100'
      width={size}
      height={size}
      aria-label='Protected main branch'
      className='overflow-visible'
    >
      <title>Protected main branch</title>
      <circle cx={50} cy={50} r={48} className='fill-secondary stroke-primary' strokeWidth={2} />
      <text x={50} y={42} textAnchor='middle' className='fill-primary font-mono text-[16px] font-bold'>
        main
      </text>
      <GitBranch x={37} y={50} width={26} height={26} strokeWidth={2.75} className='fill-none stroke-primary' />
    </svg>
  )
}

function EmblemInner({ active }: { active: boolean }) {
  const ringSize = useResponsiveRing()
  const c = ringSize / 2
  const rIn = Math.round(c * 0.82)
  const mainSize = Math.round(ringSize * 0.3)
  const mainRadius = mainSize / 2
  const labelPad = Math.round(c - (rIn + mainRadius) / 2)

  const [coreRevealed, setCoreRevealed] = useState(false)
  const [ringProgress, setRingProgress] = useState(0)
  const [clamp, setClamp] = useState(0)
  const [spark, setSpark] = useState(0)
  const [content, setContent] = useState(0)
  const [gravity, setGravity] = useState(0)
  const [pulseKey, setPulseKey] = useState(0)
  const started = useRef(false)
  const rafs = useRef<number[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ringBoxRef = useRef<HTMLDivElement>(null)

  // When the hero leaves view, reset everything so it replays on the next entry.
  useEffect(() => {
    if (active) return
    started.current = false
    for (const t of timers.current) clearTimeout(t)
    for (const r of rafs.current) cancelAnimationFrame(r)
    timers.current = []
    rafs.current = []
    setCoreRevealed(false)
    setRingProgress(0)
    setClamp(0)
    setSpark(0)
    setContent(0)
    setGravity(0)
  }, [active])

  // Runs the build once, each time the hero (re-)enters view.
  useEffect(() => {
    if (!active || started.current) return
    started.current = true

    const ramp = (dur: number, set: (v: number) => void) => {
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        set(p)
        if (p < 1) rafs.current.push(requestAnimationFrame(step))
      }
      rafs.current.push(requestAnimationFrame(step))
    }
    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms))
    }

    at(500, () => setCoreRevealed(true)) // 1. main scales in
    at(800, () => ramp(1200, setRingProgress)) // 2. ring segments deploy from their center squares
    at(2100, () => ramp(900, setSpark)) // 3. electricity draws across the gaps
    at(2700, () => ramp(800, setClamp)) // 4. columns extend from the ring and clamp main
    // 5. THE INSTANT the columns finish clamping main (clamp ramp ends at 2700+800=3500):
    //    the shock wave + curvature fire together — the wave is the immediate result of the
    //    harness biting main, so no gap, and the curvature snaps in fast (impact, not a slow fold).
    at(3500, () => {
      ramp(420, setGravity)
      setPulseKey((k) => k + 1)
    })
    at(3700, () => ramp(600, setContent)) // 6. text + CTA fade in

    return () => {
      for (const t of timers.current) clearTimeout(t)
      for (const r of rafs.current) cancelAnimationFrame(r)
    }
  }, [active])

  return (
    <div className='relative h-full w-full'>
      {/* Self-contained fabric — warped grid + curvature + shock wave, centered on main. */}
      <HeroFabric centerRef={ringBoxRef} gravity={gravity} pulseKey={pulseKey} />

      <div className='relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center'>
        <Heading
          level={1}
          className='text-balance font-sans text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl'
        >
          Sustainable software development
          <br />
          for the <span className='rounded-lg bg-accent px-3'>AI era</span>.
        </Heading>

        <div ref={ringBoxRef} className='relative' style={{ width: ringSize, height: ringSize }}>
          {/* main — scales in at the center; the columns clamp onto it. */}
          <div className='absolute inset-0 flex items-center justify-center' style={{ opacity: 0.9 }}>
            <div
              className={`transition-all duration-700 ease-out ${coreRevealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
            >
              <MainBranchNode size={mainSize} />
            </div>
          </div>

          {/* VINAYA north, HARNESS south, main between them. */}
          <div
            className='pointer-events-none absolute inset-0 flex flex-col items-center justify-between text-center'
            style={{ opacity: content, paddingTop: labelPad - 14, paddingBottom: labelPad - 12 }}
          >
            <p className='font-sans text-2xl font-extrabold uppercase leading-none tracking-[0.14em] text-foreground'>
              Vinaya
            </p>
            <p className='font-sans text-2xl font-extrabold uppercase leading-none tracking-[0.14em] text-foreground'>
              Harness
            </p>
          </div>

          {/* The wireframe harness — accent, builds from nothing (draw-on). */}
          <HarnessStructure
            size={ringSize}
            coreRadius={mainRadius - 3}
            ringProgress={ringProgress}
            clamp={clamp}
            spark={spark}
          />
        </div>

        <div style={{ opacity: content }}>
          <Button
            type='button'
            variant='default'
            size='lg'
            onClick={() => document.getElementById('hero-classic')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See More
            <ArrowDown className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Outer — a normal in-flow section (NOT a fixed overlay), so it scrolls away like every
// other section: the page is a flat stack.
export function VinayaHeroEmblem() {
  const heroRef = useRef<HTMLElement>(null)
  const inView = useIsInView(heroRef)
  return (
    <section ref={heroRef} id='hero' className='relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background'>
      <EmblemInner active={inView} />
    </section>
  )
}
