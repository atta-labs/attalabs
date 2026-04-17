'use client'

import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useAIAContext } from '@atta/ui/canvas'

// Bumped when the intro is intentionally redesigned — existing visitors see the
// new version once, then resume skipping. Read comment in the skip branch below.
const INTRO_SEEN_KEY = 'vada:home-intro-seen-v1'

export function useHomeCanvas(onOriginCompleteRef: React.MutableRefObject<(() => void) | null>) {
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

    // Skip the ~8s intro for returning visitors. `?intro=1` forces a replay
    // (demos / design review). The phase === 'settled' gate above ensures
    // spheres are registered before we jump straight to the end state.
    const forceIntro = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('intro')
    const alreadySeen = typeof window !== 'undefined' && window.localStorage.getItem(INTRO_SEEN_KEY) === '1'

    if (alreadySeen && !forceIntro) {
      setRevealedCount(6) // all spheres visible
      setActiveStep(6) // ring fully closed → animationComplete flips → startGravity fires
      return
    }

    const sequence = ['s1', 's2', 's3', 's4', 's5', 's6']

    const runSimulation = async () => {
      await new Promise((r) => setTimeout(r, 200))

      // Fire 4 origin births — they emerge from fabric, then fly straight to s1 center
      ctx.fireSphereOrigin('s1')

      // Wait for all 4 particles to converge. The canvas calls onOriginComplete when
      // the last particle arrives — which resolves this promise. Fallback: 4s timeout.
      await new Promise<void>((resolve) => {
        onOriginCompleteRef.current = resolve
        setTimeout(resolve, 4000)
      })
      onOriginCompleteRef.current = null

      setRevealedCount(1) // sphere appears as particles arrive

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

    runSimulation().then(() => {
      if (typeof window !== 'undefined') window.localStorage.setItem(INTRO_SEEN_KEY, '1')
    })
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
