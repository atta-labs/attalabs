'use client'

import '@atta/ui/canvas.css'
import { Button } from '@atta/ui/components'
import { AIACanvas, AIARing, AIASphere, useAIAContext } from '@atta/ui/canvas'
import { Heading } from '@atta/ui/shared'
import { ArrowDown, GitBranch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { HarnessStructure } from './HarnessStructure'
import { renderVinayaFabric } from './fabric-vinaya'

// Ring px scales with the viewport but caps so slogan + emblem fit one screen.
function useResponsiveRing() {
  const [ringSize, setRingSize] = useState(460)
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      setRingSize(Math.round(Math.min(460, vw * 0.8, vh * 0.58)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return ringSize
}

// The harness center — the protected `main` branch. Same clean read as the
// /the-harness hub: a plain circle + git-branch mark, NO matrix, NO particles.
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
      <circle cx={50} cy={50} r={48} className='fill-none stroke-primary' strokeWidth={2} />
      {/* main label on top, the branch symbol below it */}
      <text x={50} y={42} textAnchor='middle' className='fill-primary font-mono text-[16px] font-bold'>
        main
      </text>
      <GitBranch x={37} y={50} width={26} height={26} strokeWidth={2.75} className='fill-none stroke-primary' />
    </svg>
  )
}

// Inner — inside AIACanvas so it can read context (startGravity for the mesh fold).
function EmblemInner() {
  const ctx = useAIAContext()
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const ringSize = useResponsiveRing()
  const c = ringSize / 2
  const rIn = Math.round(c * 0.82) // ring inner edge
  const mainSize = Math.round(ringSize * 0.3) // bigger main sphere
  const mainRadius = mainSize / 2
  // Where the north/south labels sit — centered in the gap between main and the ring.
  const labelPad = Math.round(c - (rIn + mainRadius) / 2)

  const [coreRevealed, setCoreRevealed] = useState(false)
  const [ringProgress, setRingProgress] = useState(0)
  const [clamp, setClamp] = useState(0)
  const [spark, setSpark] = useState(0)
  const [content, setContent] = useState(0)
  const started = useRef(false)
  const rafs = useRef<number[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Each stage is scheduled at an absolute offset with its own independent rAF ramp.
  // The structure BUILDS from nothing (draw-on ramps); only the text fades.
  useEffect(() => {
    if (started.current) return
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
    at(800, () => ramp(1300, setRingProgress)) // 2. ring segments draw on, one by one
    at(2100, () => ramp(800, setClamp)) // 3. columns extend from the ring and clamp main
    at(2400, () => ramp(1100, setSpark)) // 4. electricity draws across the gaps in sequence
    // Fire the particle convergence EARLY — arrivals take ~1.5s, so the fabric ripple
    // (shockWaveOnArrival) lands right as the words reveal.
    at(1900, () => ctxRef.current?.fireSphereOrigin?.('core', 14, 'var(--primary)'))
    at(3300, () => {
      // Shock wave — with the ring registered at main, startGravity's ClosingPulse now
      // bursts from MAIN (rings[0].centerX), not the screen. The arrival pulses (from the
      // early fireSphereOrigin) also land on main. Fires as the words reveal.
      ctxRef.current?.startGravity?.()
      ramp(600, setContent) // text + CTA fade in
    })

    return () => {
      for (const t of timers.current) clearTimeout(t)
      for (const r of rafs.current) cancelAnimationFrame(r)
    }
  }, [])

  return (
    <div className='flex h-dvh w-full flex-col items-center justify-center gap-6 px-6 pt-16 text-center'>
      <Heading
        level={1}
        className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl'
      >
        Sustainable software development
        <br />
        for the <span className='rounded-lg bg-accent px-3'>AI era</span>.
      </Heading>

      <div className='relative' style={{ width: ringSize, height: ringSize }}>
        {/* Invisible ring centered on main — registers a ring at main's position, which
            (a) activates the fabric gravity/particle system (it only spawns once a ring
            is present + settled) and (b) makes the ClosingPulse center on MAIN, not the
            screen. activeStep=0 so its own wave segments never draw. */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <AIARing
            size={ringSize}
            activeStep={0}
            sphereRadius={mainRadius}
            bgOpacity={0}
            orbit={[<div key='r' className='size-1 opacity-0' />]}
          />
        </div>

        {/* Fabric target for the shock wave — MUST be visible (the canvas filters out
            visible:false spheres before the fabric sees them, so an invisible one is
            never a valid fireSphereOrigin target). Kept minimal: no matrix, no orbit
            particles; the clean `main` node renders on top of it. */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <AIASphere
            id='core'
            size={mainSize}
            color='var(--primary)'
            state='idle'
            showMatrix={false}
            particleCount={0}
          />
        </div>

        {/* main — scales in at the center; the columns clamp onto it. */}
        <div className='absolute inset-0 flex items-center justify-center' style={{ opacity: 0.9 }}>
          <div
            className={`transition-all duration-700 ease-out ${coreRevealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          >
            <MainBranchNode size={mainSize} />
          </div>
        </div>

        {/* VINAYA in the north quarter, HARNESS in the south quarter, main between them.
            The one element that FADES in. */}
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

      {/* See More — just below the animation, fades in with the title. */}
      <div className='pointer-events-auto' style={{ opacity: content }}>
        <Button
          type='button'
          variant='outline'
          size='lg'
          onClick={() => document.getElementById('hero-classic')?.scrollIntoView({ behavior: 'smooth' })}
        >
          See More
          <ArrowDown className='size-4' />
        </Button>
      </div>
    </div>
  )
}

// Outer — owns the AIACanvas (context provider + fabric bg). Fixed inset-0 so the
// viewport-relative sphere coords line up (see canvas skill: "MUST be fixed inset-0").
export function VinayaHeroEmblem() {
  return (
    <>
      <section id='hero' className='relative h-dvh w-full' />
      <div className='pointer-events-none fixed inset-0 z-0'>
        <AIACanvas bg={renderVinayaFabric} wanderDuration={30} alwaysRenderSpheres className='h-full w-full'>
          <EmblemInner />
        </AIACanvas>
      </div>
    </>
  )
}
