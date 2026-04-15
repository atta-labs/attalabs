'use client'

import { AgentThinkingText } from '@atta/ui'
import { AGENT_FACES_FULL, AIACanvas, AIARing, AIASphere, useAIAContext } from '@atta/ui/canvas'
import { type ReactNode, useEffect } from 'react'
import { AGENT_SPHERE_COLORS } from '@/lib/agent-theme'
import { useHomeCanvas } from './useHomeCanvas'

interface HomeCanvasProps {
  render: (state: { animationStarted: boolean; animationComplete: boolean }) => ReactNode
}

const SPHERE_IDS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const
const SPHERE_PHRASES = ['Framing...', 'Risks?', 'Counter...', 'Patterns...', 'Data...', 'Synthesis...']

// Inner — must be inside AIACanvas to access canvas context
function HomeCanvasInner({ render }: HomeCanvasProps) {
  const { activeAgent, activeStep, revealedCount, animationStarted, animationComplete } = useHomeCanvas()
  const ctx = useAIAContext()

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
          const FaceComponent = AGENT_FACES_FULL[i]
          return (
            <div
              key={id}
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'scale(1)' : 'scale(0.85)',
                transition: 'opacity 500ms ease-in, transform 500ms ease-out'
              }}
            >
              <AIASphere
                id={id}
                size='xl'
                color={AGENT_SPHERE_COLORS[i]}
                state={getSphereState(id, i)}
                showMatrix={showMatrix}
                matrixOpacity={0.3}
                solidBg={revealed}
                visible={revealed}
                face={revealed && FaceComponent ? <FaceComponent /> : undefined}
              >
                {showMatrix && (
                  <AgentThinkingText
                    text={SPHERE_PHRASES[i] ?? '...'}
                    className='text-[8px] text-center leading-tight opacity-80'
                  />
                )}
              </AIASphere>
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
  return (
    <div className='fixed inset-0 z-0'>
      <AIACanvas
        bg='fabric'
        wanderDuration={30}
        alwaysRenderSpheres
        autoTriggerGravity={false}
        className='h-full w-full'
      >
        <HomeCanvasInner render={render} />
      </AIACanvas>
    </div>
  )
}
