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
  visible?: boolean
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
  bgOpacity,
  visible = true
}: UseAIASphereProps) {
  const generatedId = useId()
  const id = externalId ?? generatedId
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useAIAContext()
  const matrixOpacityRef = useRef(matrixOpacity)
  matrixOpacityRef.current = matrixOpacity
  const solidBgRef = useRef(solidBg)
  solidBgRef.current = solidBg
  const bgOpacityRef = useRef(bgOpacity)
  bgOpacityRef.current = bgOpacity
  const visibleRef = useRef(visible)
  visibleRef.current = visible

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
    let lastColor = ''

    const track = () => {
      if (!ref.current || !ctx.containerRef.current) {
        rafId = requestAnimationFrame(track)
        return
      }

      const sphereRect = ref.current.getBoundingClientRect()
      const containerRect = ctx.containerRef.current.getBoundingClientRect()
      const exactX = sphereRect.left - containerRect.left + sphereRect.width / 2
      const exactY = sphereRect.top - containerRect.top + sphereRect.height / 2

      // Re-resolve every frame. A `var(--*)` colour is not a fixed value — it changes when
      // the colour scheme flips — and this effect does not re-run on that flip (its deps are
      // the colour STRING, which never changes). Resolving once at mount froze the sphere on
      // whichever scheme happened to be active then, so after a toggle the matrix rain was
      // drawing in the old scheme's ink: invisible against the new background.
      const resolved = resolveColor(color)

      // Only call registerSphere when something actually changed — avoids unnecessary Map
      // operations on static home-page spheres.
      if (Math.abs(exactX - lastX) > 0.5 || Math.abs(exactY - lastY) > 0.5 || resolved !== lastColor) {
        lastX = exactX
        lastY = exactY
        lastColor = resolved
        ctx.registerSphere({
          id,
          x: exactX,
          y: exactY,
          radius: diameter / 2,
          color: resolved,
          state: stateRef.current,
          particleCount: particles,
          showMatrix: showMatrixRef.current,
          matrixColors: matrixColorsRef.current,
          matrixOpacity: matrixOpacityRef.current,
          solidBg: solidBgRef.current,
          bgOpacity: bgOpacityRef.current,
          visible: visibleRef.current
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
  }, [ctx, id, diameter, color, particles])

  // Effect 2 — Render-only props sync (no position change, no cluster reassignment)
  useEffect(() => {
    if (!ctx) return
    ctx.updateSphere(id, { state, showMatrix, solidBg, bgOpacity, visible })
  }, [ctx, id, state, showMatrix, solidBg, bgOpacity, visible])

  return {
    ref,
    id,
    diameter,
    cssColor: color ?? 'var(--accent)',
    state
  }
}
