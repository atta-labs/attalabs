'use client'

import { createContext, type ReactNode, useCallback, useState } from 'react'
import { AgentSphere } from '@atta/ui/agents'
import { AGENT_SEQUENCE, useChooserScene } from './useChooserScene'
import { AGENT_FACES } from '@/components/agents/faces/agent-faces-full'

export const ChooserAnimationContext = createContext<{ animationComplete: boolean }>({
  animationComplete: false
})

const DEAD_COLOR = 'hsl(0 0% 38%)'

interface ChooserSceneProps {
  children?: ReactNode
  onOriginCompleteRef: React.MutableRefObject<(() => void) | null>
}

export function ChooserScene({ children, onOriginCompleteRef }: ChooserSceneProps) {
  const [agentIndex, setAgentIndex] = useState(-1)
  const [animationComplete, setAnimationComplete] = useState(false)

  useChooserScene({
    onOriginCompleteRef,
    onAgentArrival: useCallback((idx: number) => setAgentIndex(idx), []),
    onSequenceComplete: useCallback(() => setAnimationComplete(true), [])
  })

  const currentAgent = agentIndex >= 0 ? AGENT_SEQUENCE[agentIndex] : undefined
  const FaceComponent = agentIndex >= 0 ? AGENT_FACES[agentIndex] : undefined

  return (
    <ChooserAnimationContext.Provider value={{ animationComplete }}>
      <div className='relative flex h-dvh w-full items-center justify-center'>
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none'>
          <div className='relative w-[500px] h-[500]'>
            <AgentSphere
              id='chooser-main'
              color={currentAgent?.color ?? DEAD_COLOR}
              size={500}
              particleCount={250}
              state={currentAgent ? 'speaking' : 'idle'}
              showMatrix={!!currentAgent}
              visible
              face={FaceComponent ? <FaceComponent /> : undefined}
              faceOpacity={0.15}
            />
          </div>
        </div>
        <div className='relative w-[500px] h-[500] pt-8 pb-14'>{children}</div>
      </div>
    </ChooserAnimationContext.Provider>
  )
}
