'use client'

import { AgentThinkingText } from '@atta/ui'
import { AIACanvas, AIARing, AIASphere, useAIAContext } from '@atta/ui/canvas'
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
  const { activeAgent, activeStep, animationStarted, animationComplete } = useHomeCanvas()
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
    <div className='relative z-10 flex min-h-dvh w-full items-center justify-center overflow-hidden'>
      <AIARing
        size={600}
        activeStep={activeStep}
        thinking={animationComplete}
        sphereRadius={60}
        matrixOpacity={0.5}
        orbit={SPHERE_IDS.map((id, i) => {
          const showMatrix = activeAgent === id || isTouched(i)
          return (
            <AIASphere
              key={id}
              id={id}
              size='xl'
              color={AGENT_SPHERE_COLORS[i]}
              state={getSphereState(id, i)}
              showMatrix={showMatrix}
              matrixOpacity={0.5}
            >
              {showMatrix && (
                <AgentThinkingText
                  text={SPHERE_PHRASES[i] ?? '...'}
                  className='text-[8px] text-center leading-tight opacity-80'
                />
              )}
            </AIASphere>
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
    <AIACanvas
      bg='fabric'
      wanderDuration={30}
      alwaysRenderSpheres
      matchContentHeight
      autoTriggerGravity={false}
      className='fixed inset-0 h-full w-full z-0'
    >
      <HomeCanvasInner render={render} />
    </AIACanvas>
  )
}
