'use client'

import { useEffect, useRef } from 'react'
import { readThemeColors } from '../../_components/canvas/theme-colors'
import { findScrollParent } from '../_lib/scroll-signal'

// The roadmap's own "fabric of the universe": a 72px hairline grid with a slow warp and a
// per-line shimmer (the design's numbers), visible from the first frame. It replaces the
// shared `EnergyFieldBg` here (that component is also `/the-studio`'s and stays untouched).
//
// A viewport-fixed 2D canvas, so the cost is bounded however long the track is. Ink is the
// `foreground` token; alpha is 0.06 in light and 0.07 in dark, each line shimmering +-25%
// on a 12.6s sine. The warp is 5px + 3px with periods of ~50-90s. Parallax 0.2: the rows
// travel 20px per 100px of scroll (a pure function of the scroll offset, so scrolling back
// reverses exactly) — slower than the squares (0.5) and the content (1). Clipped at the
// bottom of its host (the track box) so it never paints over the footer, sits behind the
// beam, cards and squares, does no work while the tab is hidden, and under reduced motion
// draws one still frame (no shimmer, warp or parallax; redrawn on resize and theme change).
const G = 72 // grid pitch, px
const STEP = 32 // sample spacing along a line, px
const PARALLAX = 0.2
const ALPHA_DARK = 0.07
const ALPHA_LIGHT = 0.06

export function RoadmapFabric() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const host = canvas?.parentElement
    if (!canvas || !ctx || !host) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let colors = readThemeColors(canvas)
    let raf = 0
    let frameNo = 0
    const scroller = findScrollParent(canvas)
    const scrollTarget: HTMLElement | Window = scroller ?? window
    const readScroll = () => (scroller ? scroller.scrollTop : document.documentElement.scrollTop)
    let dirty = false
    const onScroll = () => {
      dirty = true
    }

    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w <= 0 || h <= 0) return
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const t = reduce ? 0 : now / 1000
      const fo = reduce ? 0 : readScroll() * PARALLAX
      const dark = document.documentElement.dataset.theme === 'dark'
      const base = dark ? ALPHA_DARK : ALPHA_LIGHT
      const hostBottom = host.getBoundingClientRect().bottom
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, w, Math.max(0, Math.min(h, hostBottom)))
      ctx.clip()
      ctx.strokeStyle = colors.foreground
      ctx.lineWidth = 1

      // World point (x, wy) -> screen, with the slow warp and the parallax offset.
      const warp = (x: number, wy: number): [number, number] => [
        x + 5 * Math.sin(wy * 0.006 + t * 0.12) + 3 * Math.sin((x + wy) * 0.004 - t * 0.07),
        wy - fo + 4 * Math.sin(x * 0.005 + t * 0.1)
      ]
      const shimmer = (k: number, phase: number) => (reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 0.5 + k * phase))

      // Rows: world y = k * G, visible range shifted by the parallax offset.
      const k0 = Math.floor(fo / G) - 1
      const k1 = Math.ceil((fo + h) / G) + 1
      for (let k = k0; k <= k1; k++) {
        ctx.globalAlpha = base * shimmer(k, 0.9)
        ctx.beginPath()
        for (let x = -STEP; x <= w + STEP; x += STEP) {
          const [px, py] = warp(x, k * G)
          if (x === -STEP) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
      // Columns: fixed in x around the centre, running the full height.
      const c0 = Math.floor(-w / 2 / G) - 1
      const c1 = Math.ceil(w / 2 / G) + 1
      for (let c = c0; c <= c1; c++) {
        ctx.globalAlpha = base * shimmer(c, 1.3)
        ctx.beginPath()
        let first = true
        for (let wy = fo - 2 * STEP; wy <= fo + h + 2 * STEP; wy += STEP) {
          const [px, py] = warp(w / 2 + c * G, wy)
          if (first) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
          first = false
        }
        ctx.stroke()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      frameNo += 1
      if (frameNo % 2 === 0 || dirty) {
        dirty = false
        draw(now)
      }
    }

    const redraw = () => draw(performance.now())
    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(canvas)
      redraw()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', redraw)
    if (!reduce) scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    redraw()
    if (!reduce) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      window.removeEventListener('resize', redraw)
      scrollTarget.removeEventListener('scroll', onScroll)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className='pointer-events-none fixed inset-0 size-full' />
}
