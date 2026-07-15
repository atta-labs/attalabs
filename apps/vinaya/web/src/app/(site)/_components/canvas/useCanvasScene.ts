'use client'

import { useEffect, useRef } from 'react'
import { readThemeColors, type ThemeColors } from './theme-colors'

export type SceneDrawFn = (
  ctx: CanvasRenderingContext2D,
  colors: ThemeColors,
  elapsedMs: number,
  reducedMotion: boolean,
  logicalWidth: number,
  logicalHeight: number
) => void

/**
 * Fixed non-zero elapsed time used for the `prefers-reduced-motion` static frame — each
 * scene's own per-item phase offsets are what stagger progress apart, so a real (if
 * frozen) elapsed value keeps that stagger instead of collapsing every item onto the
 * same progress the way a flat `0.5` override would.
 */
const STATIC_SNAPSHOT_MS = 1700

interface UseCanvasSceneOptions {
  logicalWidth: number
  logicalHeight: number
  draw: SceneDrawFn
}

/**
 * Page-scoped canvas scaffolding: fixed logical coordinate space scaled to the actual
 * rendered CSS size via devicePixelRatio, a rAF loop driving `draw` with elapsed time,
 * and a static single-frame render when `prefers-reduced-motion: reduce`. Deliberately
 * separate from Vada's `@atta/ui/canvas` agent-orbit particle system — this is a much
 * simpler illustrated-sprite scene, not shared infrastructure.
 */
export function useCanvasScene({ logicalWidth, logicalHeight, draw }: UseCanvasSceneOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let colors = readThemeColors(canvas)
    let rafId = 0
    let startTime = 0

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pixelWidth = rect.width * dpr
      const pixelHeight = rect.height * dpr
      canvas.width = Math.max(1, Math.round(pixelWidth))
      canvas.height = Math.max(1, Math.round(pixelHeight))
      // Uniform scale (never independent x/y factors) so circles stay circles — the
      // logical space is centered/letterboxed into whichever axis is tighter, never
      // stretched to fill a box whose aspect ratio doesn't match.
      const scale = Math.min(pixelWidth / logicalWidth, pixelHeight / logicalHeight)
      const offsetX = (pixelWidth - logicalWidth * scale) / 2
      const offsetY = (pixelHeight - logicalHeight * scale) / 2
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)
    }

    const renderFrame = (elapsedMs: number, reducedMotion: boolean) => {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight)
      drawRef.current(ctx, colors, elapsedMs, reducedMotion, logicalWidth, logicalHeight)
    }

    const tick = (now: number) => {
      if (!startTime) startTime = now
      renderFrame(now - startTime, false)
      rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      if (reduceMotionQuery.matches) {
        renderFrame(STATIC_SNAPSHOT_MS, true)
        return
      }
      startTime = 0
      rafId = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    }

    resize()
    start()

    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reduceMotionQuery.matches) renderFrame(STATIC_SNAPSHOT_MS, true)
    })
    resizeObserver.observe(canvas)

    const handleMotionPreferenceChange = () => {
      stop()
      start()
    }
    reduceMotionQuery.addEventListener('change', handleMotionPreferenceChange)

    const handleThemeChange = () => {
      colors = readThemeColors(canvas)
      if (reduceMotionQuery.matches) renderFrame(STATIC_SNAPSHOT_MS, true)
    }
    darkModeQuery.addEventListener('change', handleThemeChange)
    const themeObserver = new MutationObserver(handleThemeChange)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      stop()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      reduceMotionQuery.removeEventListener('change', handleMotionPreferenceChange)
      darkModeQuery.removeEventListener('change', handleThemeChange)
    }
  }, [logicalWidth, logicalHeight])

  return canvasRef
}
