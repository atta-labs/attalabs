'use client'

import { useState, useEffect, useRef } from 'react'
import { useAIAContext } from '@atta/ui/canvas'

const LLM_IDS = [
  'brokered-claude',
  'brokered-chatgpt',
  'brokered-gemini',
  'brokered-grok',
  'brokered-mistral',
  'brokered-deepseek',
  'brokered-llama'
] as const
type LlmId = (typeof LLM_IDS)[number]

const BRAIN_HOLD = 900 // ms brain glows before firing
const TRAVEL = 850 // ms particle travel at MSG_SPEED
const SPEAKING = 600 // ms LLM speaking flash
const RESPONSE_SPREAD = 2000 // ms random window for LLM returns
const SYNTHESIS = 1400 // ms Strategist holds after last return
const MSG_SPEED = 0.02 // progress/frame (~3.5× slower than default)

type LlmState = 'idle' | 'speaking' | 'complete'
type LlmStates = Record<LlmId, LlmState>

const IDLE_STATES: LlmStates = {
  'brokered-claude': 'idle',
  'brokered-chatgpt': 'idle',
  'brokered-gemini': 'idle',
  'brokered-grok': 'idle',
  'brokered-mistral': 'idle',
  'brokered-deepseek': 'idle',
  'brokered-llama': 'idle'
}

export function useBrokeredScene() {
  const [llmStates, setLlmStates] = useState<LlmStates>(IDLE_STATES)
  const [strategistState, setStrategistState] = useState<'idle' | 'speaking'>('idle')
  const [brainActive, setBrainActive] = useState(false)
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
    const guard = (fn: () => void, delay = 0) =>
      setTimeout(() => {
        if (alive && isMounted.current) fn()
      }, delay)

    const loop = async () => {
      // Brief initial pause before first activation
      await sleep(500)

      while (alive) {
        // ── Step 1: Brain illuminates ──────────────────────────────────
        if (isMounted.current) setBrainActive(true)
        await sleep(BRAIN_HOLD)

        // ── Step 2: Brain fires to Strategist ─────────────────────────
        if (!alive) return
        ctx.fireDirectedMessage('principal-brain', 'brokered-strategist', MSG_SPEED)
        guard(() => setBrainActive(false), 350)

        // ── Step 3: Strategist activates on particle arrival ───────────
        await sleep(TRAVEL)
        if (!alive) return
        if (isMounted.current) setStrategistState('speaking')

        // ── Step 4: Strategist broadcasts to all LLMs simultaneously ──
        LLM_IDS.forEach((id) => {
          if (!alive) return
          ctx.fireDirectedMessage('brokered-strategist', id, MSG_SPEED)
          // LLM activates only when its particle arrives
          guard(() => setLlmStates((prev) => ({ ...prev, [id]: 'speaking' })), TRAVEL)
          guard(() => setLlmStates((prev) => ({ ...prev, [id]: 'complete' })), TRAVEL + SPEAKING)
        })

        // Wait for all LLMs to receive + finish speaking
        await sleep(TRAVEL + SPEAKING + 200)

        // ── Step 5: LLMs respond at random independent times ───────────
        LLM_IDS.forEach((id) => {
          const delay = Math.floor(Math.random() * RESPONSE_SPREAD)
          setTimeout(() => {
            if (!alive) return
            ctx.fireDirectedMessage(id, 'brokered-strategist', MSG_SPEED)
          }, delay)
        })

        // Wait for all returns + synthesis pause
        await sleep(RESPONSE_SPREAD + TRAVEL + SYNTHESIS)

        // ── Step 6: Strategist fires result back to brain ──────────────
        if (!alive) return
        ctx.fireDirectedMessage('brokered-strategist', 'principal-brain-entry', MSG_SPEED)

        // Reset all to sleeping before brain re-illuminates
        guard(() => setStrategistState('idle'), 400)
        guard(() => setLlmStates(IDLE_STATES), 600)

        // Wait for particle to reach brain
        await sleep(TRAVEL + 300)

        // loop back → brain illuminates again at top
      }
    }

    loop()
    return () => {
      alive = false
    }
  }, [ctx?.phase])

  return { llmStates, strategistState, brainActive }
}
