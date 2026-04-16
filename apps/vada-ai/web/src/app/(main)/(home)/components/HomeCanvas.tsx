'use client'

import { AIAgent, AIACanvas, AIARing, useAIAContext, type AgentName } from '@atta/ui/canvas'
import { type ReactNode, useEffect, useRef } from 'react'
import { useHomeCanvas } from './useHomeCanvas'
import { useSphereAbsorb } from './useSphereAbsorb'
import { useUserPreferences } from '@/lib/user-preferences-context'

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
  const { activeAgent, activeStep, revealedCount, animationStarted, animationComplete } = useHomeCanvas(onOriginCompleteRef)
  const ctx = useAIAContext()
  const { faceStyle } = useUserPreferences()

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
        size={600}
        activeStep={activeStep}
        thinking={animationComplete}
        sphereRadius={60}
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
                size='xl'
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

  return (
    <div className='fixed inset-0 z-0'>
      <AIACanvas
        bg='fabric'
        wanderDuration={30}
        alwaysRenderSpheres
        autoTriggerGravity={false}
        onSphereAbsorb={onSphereAbsorb}
        onOriginComplete={() => onOriginCompleteRef.current?.()}
        className='h-full w-full'
      >
        <HomeCanvasInner render={render} registerSphere={registerSphere} onOriginCompleteRef={onOriginCompleteRef} />
      </AIACanvas>
    </div>
  )
}
