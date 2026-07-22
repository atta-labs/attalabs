'use client'

import { Button } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowDown, GitBranch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { HarnessStructure } from './HarnessStructure'
import { HeroFabric } from './HeroFabric'

// Persisted "has the build already played" flag (Vāda pattern): first visit animates,
// every visit after — this session or a later one — shows the final state instantly.
const SEEN_KEY = 'vinaya-hero-seen'

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

// main's squeeze pulse (0→1): compresses under the clamp's pressure, then rebounds past 1
// and settles — the physical "grab" whose rebound punches out the shock wave.
function pulseScale(x: number): number {
  if (x <= 0 || x >= 1) return 1
  if (x < 0.22) return 1 - 0.17 * (x / 0.22) // compress 1 → 0.83
  if (x < 0.5) return 0.83 + 0.28 * ((x - 0.22) / 0.28) // rebound 0.83 → 1.11
  return 1.11 - 0.11 * ((x - 0.5) / 0.5) // settle 1.11 → 1.0
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

function EmblemInner() {
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
  const [mainPulse, setMainPulse] = useState(0)
  const rafs = useRef<number[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ringBoxRef = useRef<HTMLDivElement>(null)

  // Plays the build ONCE, ever. Returning visitors (flag persisted in localStorage) jump
  // straight to the final settled state — no build, no shock wave — so a portal/studio
  // switch or any nav back doesn't replay it.
  useEffect(() => {
    let seen = false
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // localStorage unavailable (private mode / SSR guard) — just play the animation.
    }

    if (seen) {
      setCoreRevealed(true)
      setRingProgress(1)
      setClamp(1)
      setSpark(1)
      setContent(1)
      setGravity(1)
      return
    }

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
    // 2. ring ramp — first ~60% is the slow screw emergence (grow + sparks), then bands deploy
    at(800, () => ramp(3000, setRingProgress))
    at(3900, () => ramp(900, setSpark)) // 3. electricity draws across the gaps
    at(4500, () => ramp(800, setClamp)) // 4. columns extend + hook/screw latch onto main
    // 5. As the hooks bite, main SQUEEZES under the pressure (compress → rebound).
    at(5250, () => ramp(620, setMainPulse))
    // 6. The rebound punches out the shock wave + curvature — the consequence of the grab.
    //    Curvature radiates from main outward (radialFold) at the wave's pace, synced to the
    //    ClosingPulse and to main's rebound.
    at(5380, () => {
      ramp(1300, setGravity)
      setPulseKey((k) => k + 1)
    })
    at(5600, () => ramp(600, setContent)) // 7. text + CTA fade in
    at(6300, () => {
      // Remember it played — every later visit skips straight to the final state.
      try {
        window.localStorage.setItem(SEEN_KEY, '1')
      } catch {
        // ignore
      }
    })

    return () => {
      for (const t of timers.current) clearTimeout(t)
      for (const r of rafs.current) cancelAnimationFrame(r)
    }
  }, [])

  return (
    <div className='relative h-full w-full'>
      {/* Self-contained fabric — warped grid + curvature + shock wave, centered on main. */}
      <HeroFabric centerRef={ringBoxRef} gravity={gravity} pulseKey={pulseKey} />

      <div className='relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center'>
        <div className='flex flex-col items-center justify-center gap-3'>
          <Heading
            level={1}
            className='text-balance font-sans text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl'
          >
            Sustainable software development
            <br />
            for the <span className='rounded-lg bg-accent px-3'>AI era</span>.
          </Heading>
          <Text className='text-balance font-sans text-xl leading-tight font-extrabold tracking-tight text-foreground/70'>
            Execution governance for software teams.
          </Text>
        </div>
        <div ref={ringBoxRef} className='relative' style={{ width: ringSize, height: ringSize }}>
          {/* main — scales in at the center; the columns clamp onto it. */}
          <div className='absolute inset-0 flex items-center justify-center' style={{ opacity: 0.9 }}>
            <div
              className={`transition-all duration-700 ease-out ${coreRevealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
            >
              {/* squeeze-pulse under the clamp pressure — inner wrapper so it composes with
                  the reveal scale above without fighting it */}
              <div style={{ transform: `scale(${pulseScale(mainPulse)})` }}>
                <MainBranchNode size={mainSize} />
              </div>
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
  return (
    <section id='hero' className='relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background'>
      <EmblemInner />
    </section>
  )
}
