'use client'

import { AIAgent, AIACanvas, AIARing, useAIAContext, type AgentName } from '@atta/ui/canvas'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useHomeCanvas } from './useHomeCanvas'
import { useSphereAbsorb } from './useSphereAbsorb'
import { useUserPreferences } from '@/lib/user-preferences-context'

const MAX_RING = 600
const SPHERE_RATIO = 128 / 600
const MIN_SPHERE = 48

function useResponsiveRingSize() {
  const [dims, setDims] = useState({ ringSize: MAX_RING, sphereSize: 128, sphereRadius: 64 })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ringSize = Math.min(MAX_RING, Math.floor(Math.min(vw * 0.85, vh * 0.7)))
      const sphereSize = Math.max(MIN_SPHERE, Math.round(ringSize * SPHERE_RATIO))
      setDims({ ringSize, sphereSize, sphereRadius: Math.round(sphereSize / 2) })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('orientationchange', compute)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', compute)
    }
  }, [])
  return dims
}

function useIsInView(ref: React.RefObject<HTMLElement | null>) {
  const [isInView, setIsInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setIsInView(entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return isInView
}

interface HomeCanvasProps {
  render: (state: { animationStarted: boolean; animationComplete: boolean }) => ReactNode
}

interface HomeCanvasInnerProps extends HomeCanvasProps {
  registerSphere: (id: string, el: HTMLElement | null) => void
  onOriginCompleteRef: React.MutableRefObject<(() => void) | null>
}

const AGENTS: AgentName[] = ['Strategist', 'Critic', "Devil's Advocate", 'Synthesizer', 'Researcher', 'Operator']

const SPHERE_IDS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const
const SPHERE_PHRASES = ['Framing...', 'Risks?', 'Counter...', 'Patterns...', 'Data...', 'Synthesis...']

// Inner — must be inside AIACanvas to access canvas context
function HomeCanvasInner({ render, registerSphere, onOriginCompleteRef }: HomeCanvasInnerProps) {
  const { activeAgent, activeStep, revealedCount, animationStarted, animationComplete } =
    useHomeCanvas(onOriginCompleteRef)
  const ctx = useAIAContext()
  const { faceStyle } = useUserPreferences()
  const { ringSize, sphereSize, sphereRadius } = useResponsiveRingSize()

  const isTouched = (index: number) => activeStep > index
  const getSphereState = (id: string, index: number) => {
    if (activeAgent === id || isTouched(index)) return 'speaking' as const
    return 'idle' as const
  }

  useEffect(() => {
    if (!animationComplete) return
    const id = setTimeout(() => ctx?.startGravity(), 500)
    return () => clearTimeout(id)
  }, [animationComplete, ctx])

  return (
    <div className='relative flex h-dvh w-full items-center justify-center overflow-hidden'>
      <AIARing
        size={ringSize}
        activeStep={activeStep}
        thinking={animationComplete}
        sphereRadius={sphereRadius}
        matrixOpacity={0.2}
        orbit={SPHERE_IDS.map((id, i) => {
          const revealed = revealedCount > i
          const showMatrix = activeAgent === id || isTouched(i)
          return (
            <div
              key={id}
              ref={(el) => registerSphere(id, el)}
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'scale(1)' : 'scale(0.85)',
                transition: 'opacity 500ms ease-in, transform 500ms ease-out'
              }}
            >
              <AIAgent
                id={id}
                name={AGENTS[i]!}
                faceStyle={faceStyle}
                size={sphereSize}
                state={getSphereState(id, i)}
                showMatrix={showMatrix}
                thinkingText={SPHERE_PHRASES[i] ?? '...'}
                solidBg={revealed}
                visible={revealed}
                noLabel
              />
            </div>
          )
        })}
      >
        {render({ animationStarted, animationComplete })}
      </AIARing>
    </div>
  )
}

// Outer — sets up AIACanvas (the context provider), renders HomeCanvasInner inside it
export function HomeCanvas({ render }: HomeCanvasProps) {
  const { onSphereAbsorb, registerSphere } = useSphereAbsorb()
  const onOriginCompleteRef = useRef<(() => void) | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const isInView = useIsInView(heroRef)

  return (
    <>
      <section ref={heroRef} id='hero' className='relative h-dvh w-full' />
      <div
        className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-out ${isInView ? 'opacity-100' : 'opacity-0'}`}
      >
        <AIACanvas
          bg='fabric'
          wanderDuration={30}
          alwaysRenderSpheres
          autoTriggerGravity={false}
          paused={!isInView}
          onSphereAbsorb={onSphereAbsorb}
          onOriginComplete={() => onOriginCompleteRef.current?.()}
          className='h-full w-full'
        >
          <HomeCanvasInner render={render} registerSphere={registerSphere} onOriginCompleteRef={onOriginCompleteRef} />
        </AIACanvas>
      </div>
    </>
  )
}
