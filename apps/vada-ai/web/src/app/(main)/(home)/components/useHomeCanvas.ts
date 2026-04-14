'use client'

import { useState, useEffect, useRef } from 'react'
import { useAIAContext } from '@atta/ui/canvas'

export function useHomeCanvas() {
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [revealedCount, setRevealedCount] = useState(0)
  const [messageSignal, setMessageSignal] = useState<{ from: string; to: string } | null>(null)
  const simulationStarted = useRef(false)

  const ctx = useAIAContext()

  // Start simulation once canvas is settled — no arbitrary timer
  useEffect(() => {
    if (!ctx || ctx.phase !== 'settled' || simulationStarted.current) return
    simulationStarted.current = true

    const sequence = ['s1', 's2', 's3', 's4', 's5', 's6']

    const runSimulation = async () => {
      await new Promise((r) => setTimeout(r, 200))

      setRevealedCount(1) // reveal sphere 0

      for (let i = 0; i < sequence.length; i++) {
        const current = sequence[i] as string
        const next = sequence[(i + 1) % sequence.length] as string

        setActiveAgent(current)
        await new Promise((r) => setTimeout(r, 450))

        setActiveAgent(null)
        await new Promise((r) => setTimeout(r, 30))

        setActiveStep(i + 1)
        setMessageSignal({ from: current, to: next })

        // Reveal destination sphere when message arrives (~230ms travel)
        await new Promise((r) => setTimeout(r, 230))
        setRevealedCount(i + 2)

        await new Promise((r) => setTimeout(r, 20))
      }
    }

    runSimulation()
  }, [ctx?.phase])

  useEffect(() => {
    if (messageSignal && ctx) {
      ctx.fireDirectedMessage(messageSignal.from, messageSignal.to)
    }
  }, [messageSignal, ctx])

  return {
    activeAgent,
    activeStep,
    revealedCount,
    animationStarted: activeStep >= 1,
    animationComplete: activeStep >= 6
  }
}
