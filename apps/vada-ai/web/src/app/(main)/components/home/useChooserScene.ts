'use client'

import { useEffect, useRef } from 'react'
import { useAIAContext } from '@atta/ui/canvas'
import { AGENT_LIST } from '@/components/agents/visuals'
import type { AgentName } from '@/components/agents/visuals'

export interface AgentEntry {
  name: AgentName
  color: string
}

// Use first 3 agents from authoritative AGENT_LIST — no hardcoding
export const AGENT_SEQUENCE: AgentEntry[] = AGENT_LIST.slice(0, 3).map((a) => ({
  name: a.name as AgentName,
  color: a.visuals.color
}))

// Particle travel time from origin to sphere center (ms) with approachSpeedMultiplier=1
const PARTICLE_TRAVEL_TIME_MS = 2000
// Stagger delay between particle fires, calculated to arrive within ~200ms window
const STAGGER_DELAY_MS = Math.floor((PARTICLE_TRAVEL_TIME_MS - 200) / (AGENT_SEQUENCE.length - 1))

interface UseChooserSceneProps {
  onOriginCompleteRef: React.MutableRefObject<(() => void) | null>
  onAgentArrival: (idx: number) => void
  onSequenceComplete: () => void
}

export function useChooserScene({ onOriginCompleteRef, onAgentArrival, onSequenceComplete }: UseChooserSceneProps) {
  const startedRef = useRef(false)
  // Count total particle arrivals (incremented each time a particle touches the sphere)
  const arrivedCountRef = useRef(0)
  const ctx = useAIAContext()
  const phase = ctx?.phase
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  const onAgentArrivalRef = useRef(onAgentArrival)
  onAgentArrivalRef.current = onAgentArrival
  const onSequenceCompleteRef = useRef(onSequenceComplete)
  onSequenceCompleteRef.current = onSequenceComplete

  // Wire the collision callback — fires each time a particle touches the sphere
  useEffect(() => {
    onOriginCompleteRef.current = () => {
      const arrivedCount = arrivedCountRef.current
      if (arrivedCount >= AGENT_SEQUENCE.length) return

      // Defer React state update out of the rAF loop to avoid mid-frame re-renders
      setTimeout(() => {
        onAgentArrivalRef.current(arrivedCount)
        const nextCount = arrivedCount + 1
        arrivedCountRef.current = nextCount

        if (nextCount >= AGENT_SEQUENCE.length) {
          // All particles arrived — trigger gravity + hero reveal
          setTimeout(() => {
            ctxRef.current?.startGravity()
            onSequenceCompleteRef.current()
          }, 800)
        }
      }, 0)
    }

    return () => {
      onOriginCompleteRef.current = null
    }
  }, [onOriginCompleteRef])

  // Fire all particles in parallel with staggered delays and speed multipliers
  // so they all arrive simultaneously
  useEffect(() => {
    if (!ctx || phase !== 'settled' || startedRef.current) return
    startedRef.current = true
    arrivedCountRef.current = 0

    // Fire each particle with a staggered delay and speed multiplier
    // All should arrive at the same time despite firing at different times
    // Speed multiplier = base_time / actual_remaining_time
    const targetArrivalTime = 400 + PARTICLE_TRAVEL_TIME_MS
    const timers = AGENT_SEQUENCE.map((agent, idx) => {
      const fireDelay = idx === 0 ? 400 : 400 + idx * STAGGER_DELAY_MS
      const remainingTimeToArrival = Math.max(100, targetArrivalTime - fireDelay)
      const speedMultiplier = PARTICLE_TRAVEL_TIME_MS / remainingTimeToArrival
      return setTimeout(() => {
        ctxRef.current?.fireSphereOrigin('chooser-main', 1, agent.color, speedMultiplier)
      }, fireDelay)
    })

    return () => {
      timers.forEach(clearTimeout)
      startedRef.current = false
      arrivedCountRef.current = 0
    }
  }, [ctx, phase])
}
