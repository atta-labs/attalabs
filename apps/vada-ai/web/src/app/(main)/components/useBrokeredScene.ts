'use client'

import { useState, useEffect, useRef } from 'react'
import { useAIAContext } from '@atta/ui/canvas'

const LLM_IDS = ['brokered-claude', 'brokered-chatgpt', 'brokered-gemini', 'brokered-grok'] as const
type LlmId = (typeof LLM_IDS)[number]

const STAGGER = 150 // ms between each outbound dispatch
const TRAVEL = 230 // directed message travel time (canvas default speed)
const SPEAKING = 400 // ms each LLM stays in speaking state
const SYNTHESIS = 1000 // ms Strategist holds after all returns arrive

type LlmStates = Record<LlmId, 'idle' | 'speaking'>

const IDLE_STATES: LlmStates = {
  'brokered-claude': 'idle',
  'brokered-chatgpt': 'idle',
  'brokered-gemini': 'idle',
  'brokered-grok': 'idle'
}

export function useBrokeredScene() {
  const [llmStates, setLlmStates] = useState<LlmStates>(IDLE_STATES)
  const simulationStarted = useRef(false)
  const isMounted = useRef(true)
  const ctx = useAIAContext()

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!ctx || ctx.phase !== 'settled' || simulationStarted.current) return
    simulationStarted.current = true

    let alive = true
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    const loop = async () => {
      while (alive) {
        // Phase 1: Outbound — Strategist dispatches to each LLM, staggered
        LLM_IDS.forEach((id, i) => {
          const dispatchAt = i * STAGGER
          setTimeout(() => {
            if (!alive) return
            ctx.fireDirectedMessage('brokered-strategist', id)
            // LLM lights up after particle arrives
            setTimeout(() => {
              if (!isMounted.current) return
              setLlmStates((prev) => ({ ...prev, [id]: 'speaking' }))
              setTimeout(() => {
                if (!isMounted.current) return
                setLlmStates((prev) => ({ ...prev, [id]: 'idle' }))
              }, SPEAKING)
            }, TRAVEL)
          }, dispatchAt)
        })

        // Wait for last dispatch + travel + speaking + small buffer before returns
        // Last dispatch fires at (n-1)*STAGGER = 450ms
        // Last LLM stops speaking at 450 + 230 + 400 = 1080ms
        await sleep((LLM_IDS.length - 1) * STAGGER + TRAVEL + SPEAKING + 200)

        // Phase 2: Return — each LLM sends response back to Strategist, staggered
        LLM_IDS.forEach((id, i) => {
          setTimeout(() => {
            if (!alive) return
            ctx.fireDirectedMessage(id, 'brokered-strategist')
          }, i * STAGGER)
        })

        // Wait for last return + travel + synthesis pause before next loop
        await sleep((LLM_IDS.length - 1) * STAGGER + TRAVEL + SYNTHESIS)
      }
    }

    loop()

    return () => {
      alive = false
    }
  }, [ctx?.phase])

  return { llmStates }
}
