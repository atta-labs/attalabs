'use client'

import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useAIAContext } from '@atta/ui/canvas'

// Bumped when the intro is intentionally redesigned — existing visitors see the
// new version once, then resume skipping. Read comment in the skip branch below.
const INTRO_SEEN_KEY = 'vada:home-intro-seen-v1'

const MAX_RING = 600
const SPHERE_RATIO = 128 / 600
const MIN_SPHERE = 48

function useResponsiveRingSize() {
  const [dims, setDims] = useState({ ringSize: MAX_RING, sphereSize: 128, sphereRadius: 64 })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ringSize = Math.min(MAX_RING, Math.floor(Math.min(vw * 0.85, vh * 0.7)))
      const sphereSize = Math.max(MIN_SPHERE, Math.round(ringSize * SPHERE_RATIO))
      setDims({ ringSize, sphereSize, sphereRadius: Math.round(sphereSize / 2) })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('orientationchange', compute)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', compute)
    }
  }, [])
  return dims
}

// Scroll-driven opacity: rAF loop reads #hero.getBoundingClientRect().top every frame.
// Works with any scroll container (window or custom) — no scroll event listener needed.
// ringVisible flips only at a threshold — drives canvas effect props that need a boolean.
// Fade profile: 50% scroll → 75% faded; fully gone at ~67% scroll.
function useScrollRingOpacity() {
  const ringDivRef = useRef<HTMLDivElement | null>(null)
  const [ringVisible, setRingVisible] = useState(true)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const hero = document.getElementById('hero')
      if (hero) {
        const top = hero.getBoundingClientRect().top
        const vh = window.innerHeight
        // top goes negative as user scrolls; -top / (vh*2/3) → ratio 0→1.
        const scrollRatio = Math.max(0, Math.min(1, -top / (vh * (2 / 3))))
        const opacity = 1 - scrollRatio
        if (ringDivRef.current) ringDivRef.current.style.opacity = String(opacity)
        // Only trigger a React re-render when crossing the visibility threshold.
        const next = opacity > 0.05
        setRingVisible((prev) => (prev === next ? prev : next))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { ringDivRef, ringVisible }
}

export function useHomeCanvas(onOriginCompleteRef: React.MutableRefObject<(() => void) | null>) {
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [revealedCount, setRevealedCount] = useState(0)
  const [messageSignal, setMessageSignal] = useState<{ from: string; to: string } | null>(null)
  const simulationStarted = useRef(false)

  const ctx = useAIAContext()
  const { ringSize, sphereSize, sphereRadius } = useResponsiveRingSize()
  const { ringDivRef, ringVisible } = useScrollRingOpacity()

  // Start simulation once canvas is settled — no arbitrary timer.
  // On scroll-back the simulation never re-runs (simulationStarted stays true),
  // so revealedCount/activeStep remain at 6 and the ring fades back in fully formed.
  useEffect(() => {
    if (ctx?.phase !== 'settled' || simulationStarted.current) return
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

  const animationComplete = activeStep >= 6

  // Shockwave: when the fully-formed ring scrolls off screen, fire a closing pulse
  // so the fabric visibly "snaps back" from where the ring was.
  const shockwaveFiredRef = useRef(false)
  useEffect(() => {
    if (!animationComplete || ringVisible || shockwaveFiredRef.current || !ctx) return
    shockwaveFiredRef.current = true
    ctx.startGravity()
  }, [animationComplete, ringVisible, ctx])

  return {
    activeAgent,
    activeStep,
    revealedCount,
    animationStarted: activeStep >= 1,
    animationComplete,
    ringSize,
    sphereSize,
    sphereRadius,
    ringDivRef,
    ringVisible
  }
}
