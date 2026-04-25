'use client'

import { useCallback, useRef, useState } from 'react'
import type { AgentName } from '@vada/agents'

const AGENT_SEQUENCE: AgentName[] = [
  'Strategist',
  'Critic',
  "Devil's Advocate",
  'Synthesizer',
  'Researcher',
  'Operator'
]

export function useChooserScene() {
  const [currentAgent, setCurrentAgent] = useState<AgentName>('Strategist')
  const [isFlashing, setIsFlashing] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)
  const nextIndexRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cyclingRef = useRef(false)

  const startCycle = useCallback(() => {
    if (cyclingRef.current) return
    cyclingRef.current = true
    let idx = 0
    const tick = () => {
      if (idx >= AGENT_SEQUENCE.length) {
        setIsFlashing(false)
        setAnimationComplete(true)
        return
      }
      setCurrentAgent(AGENT_SEQUENCE[idx]!)
      setIsFlashing(true)
      idx++
      setTimeout(tick, 250)
    }
    tick()
  }, [])

  const handleAbsorb = useCallback(
    (sphereId: string) => {
      if (sphereId !== 'chooser-main') return
      if (cyclingRef.current) return

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)

      const idx = nextIndexRef.current
      const agentName = AGENT_SEQUENCE[idx % AGENT_SEQUENCE.length]!

      setCurrentAgent(agentName)
      setIsFlashing(true)
      nextIndexRef.current = idx + 1

      if (nextIndexRef.current >= AGENT_SEQUENCE.length) {
        setTimeout(startCycle, 1200)
      } else {
        flashTimerRef.current = setTimeout(() => setIsFlashing(false), 1500)
      }
    },
    [startCycle]
  )

  return { currentAgent, isFlashing, animationComplete, handleAbsorb }
}
