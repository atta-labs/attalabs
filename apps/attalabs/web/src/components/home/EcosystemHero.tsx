'use client'

// AttaLabs' hero — a single canvas-only composition, no particle-stream connectors of any
// kind. Vinaya's harness ring (canvas-ported, see @atta/ui/canvas HarnessRing) encloses a
// cluster: Engine (a gear, the plinth/substrate) with Vāda (a plain AIASphere) and Herald (a
// flag mark) perched on top. Reveal order: the ring closes first, Engine settles next, then
// Vāda + Herald rise together — each mark fires exactly one pulse into the shared HeroFabric
// instance on its own reveal completion. The wordmark ("ATTALABS") burns into the fabric mesh
// last, via HeroFabric's own single-pass wordmark reveal.

import { AIASphere, EngineGear, HarnessRing, HeraldFlag, HeroFabric } from '@atta/ui/canvas'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { useEffect, useRef, useState } from 'react'

function useResponsiveSizes() {
  const [dims, setDims] = useState({ ringSize: 420, isMobile: false })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const isMobile = vw < 640
      const ringSize = Math.round(
        Math.max(isMobile ? 300 : 320, Math.min(isMobile ? 360 : 480, vw * (isMobile ? 0.88 : 0.6), vh * 0.55))
      )
      setDims({ ringSize, isMobile })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])
  return dims
}

function MarkLabel({
  name,
  href,
  descriptor,
  reveal
}: {
  name: string
  href?: string
  descriptor: string
  reveal: number
}) {
  return (
    <div className='flex flex-col items-center gap-0.5' style={{ opacity: reveal }}>
      {href ? (
        <NextLink href={href} variant='prose' className='font-mono text-xs font-bold uppercase tracking-wider'>
          {name}
        </NextLink>
      ) : (
        <Text as='span' className='font-mono text-xs font-bold uppercase tracking-wider text-foreground'>
          {name}
        </Text>
      )}
      <Text as='span' className='font-mono text-[10px] text-muted-foreground'>
        {descriptor}
      </Text>
    </div>
  )
}

function HeroInner() {
  const { ringSize, isMobile } = useResponsiveSizes()

  // Mark sizes derive from ringSize with a smaller ratio on mobile than desktop — the
  // cluster shrinks faster than the ring does, so the ring reads as shrinking LESS
  // aggressively than what it encloses.
  const sphereSize = Math.round(ringSize * (isMobile ? 0.16 : 0.22))
  const engineWidth = Math.round(ringSize * (isMobile ? 0.5 : 0.78))
  const engineHeight = Math.round(engineWidth * 0.42)
  const pairGap = 16
  const rowGap = isMobile ? 10 : 12

  const clusterW = isMobile ? Math.max(sphereSize, engineWidth) : Math.max(sphereSize * 2 + pairGap, engineWidth)
  const clusterH = isMobile
    ? sphereSize + rowGap + sphereSize + rowGap + engineHeight
    : sphereSize + rowGap + engineHeight
  const clusterRadius = Math.round(0.5 * Math.sqrt(clusterW * clusterW + clusterH * clusterH))

  const [ringProgress, setRingProgress] = useState(0)
  const [clamp, setClamp] = useState(0)
  const [spark, setSpark] = useState(0)
  const [engineReveal, setEngineReveal] = useState(0)
  const [vadaReveal, setVadaReveal] = useState(0)
  const [heraldReveal, setHeraldReveal] = useState(0)
  const [gravity, setGravity] = useState(0)
  const [pulseKey, setPulseKey] = useState(0)

  const rafs = useRef<number[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clusterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

    // 1. Ring — screws rise, then bands deploy.
    at(300, () => ramp(3000, setRingProgress))
    // 2. Electricity draws across the gaps.
    at(3400, () => ramp(900, setSpark))
    // 3. Columns extend and clamp onto the cluster's bounding radius.
    at(4000, () => ramp(800, setClamp))
    // 4. The ring CLOSES. One pulse.
    at(4900, () => setPulseKey((k) => k + 1))
    // 5. Engine settles (+300ms after the ring closes). One pulse on its own completion.
    at(5200, () => ramp(700, setEngineReveal))
    at(5900, () => setPulseKey((k) => k + 1))
    // 6. Vāda + Herald rise together (+500ms after Engine settles). Each still fires its
    //    own pulse — staggered a beat apart so both are discrete events.
    at(6400, () => {
      ramp(700, setVadaReveal)
      ramp(700, setHeraldReveal)
    })
    at(7100, () => setPulseKey((k) => k + 1))
    at(7150, () => setPulseKey((k) => k + 1))
    // 7. The wordmark burns into the fabric last, one slow illumination pass.
    at(7600, () => ramp(2600, setGravity))

    return () => {
      for (const t of timers.current) clearTimeout(t)
      for (const r of rafs.current) cancelAnimationFrame(r)
    }
  }, [])

  return (
    <div className='relative h-full w-full'>
      <HeroFabric
        centerRef={clusterRef}
        gravity={gravity}
        pulseKey={pulseKey}
        config={{ gravityMultiplier: 0, wordmark: { text: 'ATTALABS' } }}
      />

      <div className='relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center'>
        <div className='relative' style={{ width: ringSize, height: ringSize }}>
          <HarnessRing
            size={ringSize}
            clusterRadius={clusterRadius}
            ringProgress={ringProgress}
            clamp={clamp}
            spark={spark}
          />

          <div ref={clusterRef} className='absolute inset-0 flex items-center justify-center'>
            <div className='flex flex-col items-center' style={{ gap: rowGap }}>
              {isMobile ? (
                <>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='relative' style={{ width: sphereSize, height: sphereSize, opacity: vadaReveal }}>
                      <AIASphere
                        id='attalabs-hero-vada'
                        state='complete'
                        color='var(--primary)'
                        size={sphereSize}
                        particleCount={22}
                        showMatrix
                        matrixOpacity={0.5}
                      />
                    </div>
                    <MarkLabel
                      name='Vāda'
                      href='https://vada.attalabs.dev'
                      descriptor='Deliberation'
                      reveal={vadaReveal}
                    />
                  </div>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='relative' style={{ width: sphereSize, height: sphereSize }}>
                      <HeraldFlag revealProgress={heraldReveal} />
                    </div>
                    <MarkLabel
                      name='Herald'
                      href='https://herald.attalabs.dev'
                      descriptor='Forensic audit'
                      reveal={heraldReveal}
                    />
                  </div>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='relative' style={{ width: engineWidth, height: engineHeight }}>
                      <EngineGear revealProgress={engineReveal} />
                    </div>
                    <MarkLabel name='Engine' descriptor='Execution substrate' reveal={engineReveal} />
                  </div>
                </>
              ) : (
                <>
                  <div className='flex items-start' style={{ gap: pairGap }}>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='relative' style={{ width: sphereSize, height: sphereSize, opacity: vadaReveal }}>
                        <AIASphere
                          id='attalabs-hero-vada'
                          state='complete'
                          color='var(--primary)'
                          size={sphereSize}
                          particleCount={22}
                          showMatrix
                          matrixOpacity={0.5}
                        />
                      </div>
                      <MarkLabel
                        name='Vāda'
                        href='https://vada.attalabs.dev'
                        descriptor='Deliberation'
                        reveal={vadaReveal}
                      />
                    </div>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='relative' style={{ width: sphereSize, height: sphereSize }}>
                        <HeraldFlag revealProgress={heraldReveal} />
                      </div>
                      <MarkLabel
                        name='Herald'
                        href='https://herald.attalabs.dev'
                        descriptor='Forensic audit'
                        reveal={heraldReveal}
                      />
                    </div>
                  </div>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='relative' style={{ width: engineWidth, height: engineHeight }}>
                      <EngineGear revealProgress={engineReveal} />
                    </div>
                    <MarkLabel name='Engine' descriptor='Execution substrate' reveal={engineReveal} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <MarkLabel name='Vinaya' href='https://vinaya.attalabs.dev' descriptor='Governance' reveal={clamp} />
      </div>
    </div>
  )
}

export function EcosystemHero() {
  return (
    <section className='relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background'>
      <HeroInner />
    </section>
  )
}
