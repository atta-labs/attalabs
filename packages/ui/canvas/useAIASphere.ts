// ── useAIASphere.ts ───────────────────────────────────────────────────────────
// Continuous position tracking via rAF — works regardless of which element scrolls.

import { useEffect, useId, useRef } from 'react'
import { type SphereState, useAIAContext } from './aia-context'
import { resolveColor } from './shared/colors'

const SIZE_MAP: Record<string, number> = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128
}

const PARTICLE_MAP: Record<string, number> = {
  xs: 8,
  sm: 15,
  md: 25,
  lg: 35,
  xl: 50
}

interface UseAIASphereProps {
  id?: string
  state?: SphereState
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  particleCount?: number
  showMatrix?: boolean
  matrixColors?: string[]
  matrixOpacity?: number
  solidBg?: boolean
  bgOpacity?: number
}

export function useAIASphere({
  id: externalId,
  state = 'idle',
  color,
  size = 'md',
  particleCount,
  showMatrix = true,
  matrixColors,
  matrixOpacity,
  solidBg = false,
  bgOpacity
}: UseAIASphereProps) {
  const generatedId = useId()
  const id = externalId ?? generatedId
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useAIAContext()
  const matrixOpacityRef = useRef(matrixOpacity)
  matrixOpacityRef.current = matrixOpacity

  const diameter = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 64)
  const particles = particleCount ?? (typeof size === 'string' ? (PARTICLE_MAP[size] ?? 25) : 25)
  const matrixColorsRef = useRef(matrixColors)
  matrixColorsRef.current = matrixColors
  const stateRef = useRef(state)
  const showMatrixRef = useRef(showMatrix)
  stateRef.current = state
  showMatrixRef.current = showMatrix

  // Effect 1 — Continuous position tracking via rAF.
  // Updates sphere position EVERY FRAME so particles follow regardless of
  // what causes the DOM to move (window scroll, nested overflow scroll,
  // CSS animations, layout shifts, anything).
  // Cost: one getBoundingClientRect per sphere per frame — negligible.
  useEffect(() => {
    if (!ctx || !ref.current || !ctx.containerRef.current) return

    let rafId = 0
    let lastX = -1
    let lastY = -1

    const track = () => {
      if (!ref.current || !ctx.containerRef.current) {
        rafId = requestAnimationFrame(track)
        return
      }

      const sphereRect = ref.current.getBoundingClientRect()
      const containerRect = ctx.containerRef.current.getBoundingClientRect()
      const exactX = sphereRect.left - containerRect.left + sphereRect.width / 2
      const exactY = sphereRect.top - containerRect.top + sphereRect.height / 2

      // Only call registerSphere when position actually changed — avoids
      // unnecessary Map operations on static home-page spheres.
      if (Math.abs(exactX - lastX) > 0.5 || Math.abs(exactY - lastY) > 0.5) {
        lastX = exactX
        lastY = exactY
        ctx.registerSphere({
          id,
          x: exactX,
          y: exactY,
          radius: diameter / 2,
          color: resolveColor(color),
          state: stateRef.current,
          particleCount: particles,
          showMatrix: showMatrixRef.current,
          matrixColors: matrixColorsRef.current,
          matrixOpacity: matrixOpacityRef.current,
          solidBg,
          bgOpacity
        })
      }

      rafId = requestAnimationFrame(track)
    }

    // Initial registration + start tracking
    rafId = requestAnimationFrame(track)

    return () => {
      cancelAnimationFrame(rafId)
      ctx.unregisterSphere(id)
    }
  }, [ctx, id, diameter, color, particles, solidBg, bgOpacity])

  // Effect 2 — State/showMatrix sync (no position change, no order change)
  useEffect(() => {
    if (!ctx) return
    ctx.updateSphere(id, { state, showMatrix })
  }, [ctx, id, state, showMatrix])

  return {
    ref,
    id,
    diameter,
    cssColor: color ?? 'var(--accent)',
    state
  }
}
