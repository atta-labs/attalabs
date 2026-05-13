'use client'

import { useEffect, useRef, useState } from 'react'

const MAX_RING = 600
const DIAMOND_SIZE_RATIO = 0.2
const MIN_DIAMOND = 60

// Sequential clockwise reveal — each diamond appears in turn, no parallel beat.
// The cognitive flow framing lives in the labels (FOCUS / MEMORY / DELIBERATION /
// OWNERSHIP); the animation just reveals the composition cleanly.
//
//   0  initial (nothing visible)
//   1  FOCUS appears        (top, 0ms)
//   2  MEMORY appears       (right, 400ms)
//   3  DELIBERATION appears (bottom, 800ms)
//   4  OWNERSHIP appears    (left, 1200ms)
//   5  Closed connector path draws on continuously clockwise from FOCUS (1600ms, 1500ms duration)
//   6  Connector settles to dashed pattern; wordmark + subtitle + tagline fade in (3100ms)
//
// Total ~3.1s.
export type HomePhase = 0 | 1 | 2 | 3 | 4 | 5 | 6

function useResponsiveLayout() {
  const [dims, setDims] = useState({ ringSize: MAX_RING, diamondSize: 88, R: 250 })

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ringSize = Math.min(MAX_RING, Math.floor(Math.min(vw * 0.85, vh * 0.7)))
      const diamondSize = Math.max(MIN_DIAMOND, Math.round(ringSize * DIAMOND_SIZE_RATIO))
      const h = Math.round(diamondSize * 0.46)
      const R = Math.min(240, Math.floor(ringSize / 2 - h - 16))
      setDims({ ringSize, diamondSize, R })
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
        const scrollRatio = Math.max(0, Math.min(1, -top / (vh * (2 / 3))))
        const opacity = 1 - scrollRatio
        if (ringDivRef.current) ringDivRef.current.style.opacity = String(opacity)
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useHomeCanvas() {
  const [phase, setPhase] = useState<HomePhase>(0)
  const simulationStarted = useRef(false)

  const { ringSize, diamondSize, R } = useResponsiveLayout()
  const { ringDivRef, ringVisible } = useScrollRingOpacity()

  useEffect(() => {
    if (simulationStarted.current) return
    simulationStarted.current = true

    // prefers-reduced-motion: skip the staged reveal, jump straight to final state.
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setPhase(6)
      return
    }

    const run = async () => {
      setPhase(1) // 0ms — FOCUS (top)
      await delay(400)
      setPhase(2) // 400ms — MEMORY (right)
      await delay(400)
      setPhase(3) // 800ms — DELIBERATION (bottom)
      await delay(400)
      setPhase(4) // 1200ms — OWNERSHIP (left)
      await delay(400)
      setPhase(5) // 1600ms — closed connector path begins drawing clockwise from FOCUS
      await delay(1500) // wait for the 1500ms stroke-dashoffset transition to complete
      setPhase(6) // 3100ms — connector settles to dashed; wordmark + tagline fade in
    }
    run()
  }, [])

  return {
    phase,
    animationStarted: phase >= 1,
    animationComplete: phase >= 6,
    ringSize,
    diamondSize,
    R,
    ringDivRef,
    ringVisible
  }
}
