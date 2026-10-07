'use client'

import { useEffect, useRef } from 'react'
import { readThemeColors } from '../../_components/canvas/theme-colors'
import { FOG_BAND, HORIZON_Y, hazeVisible, horizonDepth } from '../_lib/horizon'
import { findScrollParent } from '../_lib/scroll-signal'

// The roadmap's own "fabric of the universe": a hairline grid seen as a FLOOR with a horizon,
// like the landing hero's and section 04's fabrics (which are three.js planes seen from a low
// angle). No WebGL here: the tilt is a perspective projection in a 2D canvas. The vanishing
// point sits at `HORIZON_Y` of the viewport height, horizontally centred; world rows (pitch G)
// map through a ground-plane projection u = Z0 / (Z0 + s) (screen y = horizonY + D * u, D the
// floor's screen height), so rows are widely spaced at the bottom and compress toward the
// horizon; world columns (pitch G) converge to the vanishing point (x = cx + X * u). Distance
// fog: line alpha is multiplied by `horizonDepth(u)^2` (0 at the horizon, 1 after the first 35%
// of the way down) and capped by the local line spacing (alpha *= min(1, spacingPx / 6)), so
// the compressed far rows never add up to a bright band. Strength stays soft: ALPHA_LIGHT /
// ALPHA_DARK at the nearest rows, each line shimmering +-25% on a 12.6s sine, with the slow
// warp scaled by the same perspective factor.
//
// Parallax: the floor travels forward as the page scrolls — PARALLAX of the scroll distance in
// world units, rows receding toward the horizon (smaller screen y) and wrapping seamlessly by
// the row pitch. It is a pure function of the scroll offset (the only clock is the shimmer),
// so scrolling back reverses exactly. A viewport-fixed canvas, so the cost is bounded however
// long the track is; clipped at the bottom of its host (the track box) so it never paints over
// the footer, with a haze mask at the horizon (the grid dissolves into nothing, no first line), behind the beam, cards and squares, no work while the tab is hidden, and under
// reduced motion one still frame (no shimmer, warp or parallax; redrawn on resize and theme).
const G = 72 // world pitch of rows and columns, px
const Z0 = 700 // camera distance: the nearest row (bottom of the screen) is at z = Z0
const PARALLAX = 0.25 // world px travelled per px scrolled (the content travels at 1)
const MIN_U = 0.07 // nothing is drawn nearer the horizon (>= 0.02 of the viewport below it); the haze shows < 2% there
const SPACING_CAP_PX = 6 // alpha *= min(1, spacingPx / this)
const ROW_STEP = 64 // sample spacing along a row, screen px
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
      const fo = reduce ? 0 : readScroll() * PARALLAX // world distance the floor has travelled
      const dark = document.documentElement.dataset.theme === 'dark'
      const base = dark ? ALPHA_DARK : ALPHA_LIGHT
      const hostBottom = host.getBoundingClientRect().bottom
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, w, Math.max(0, Math.min(h, hostBottom)))
      ctx.clip()
      ctx.strokeStyle = colors.foreground
      ctx.lineWidth = 0.75

      const cx = w / 2
      const hy = h * HORIZON_Y
      const d = h - hy // the floor's screen height
      const shimmer = (k: number, phase: number) => (reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 0.5 + k * phase))
      // Warp in world terms (X across, z away), scaled by the perspective factor u.
      const warpX = (wx: number, z: number, u: number) =>
        reduce ? 0 : u * (5 * Math.sin(z * 0.006 + t * 0.12) + 3 * Math.sin((wx + z) * 0.004 - t * 0.07))
      const warpY = (wx: number, u: number) => (reduce ? 0 : u * 4 * Math.sin(wx * 0.005 + t * 0.1))

      // Rows: world depth s = k * G + fo, wrapped by the pitch (row k keeps its shimmer identity).
      const phase = ((fo % G) + G) % G
      const kBase = Math.floor(fo / G)
      for (let j = -1; ; j++) {
        const s = j * G + phase
        const u = Z0 / (Z0 + s)
        if (u < MIN_U) break
        const spacing = (u * u * d * G) / Z0 // screen px to the next row
        const alpha = base * shimmer(j - kBase, 0.9) * horizonDepth(u) ** 2 * Math.min(1, spacing / SPACING_CAP_PX)
        if (alpha < 0.002) continue
        ctx.globalAlpha = alpha
        ctx.beginPath()
        for (let x = -ROW_STEP; x <= w + ROW_STEP; x += ROW_STEP) {
          const wx = (x - cx) / u
          const px = x + warpX(wx, Z0 + s, u)
          const py = hy + d * u + warpY(wx, u)
          if (x === -ROW_STEP) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Columns: world x = c * G, converging to the vanishing point. A column is on screen
      // while |X| * u < cx, so far columns only show near the horizon (where fog hides them).
      const cMax = Math.ceil(cx / (MIN_U * G)) + 1
      for (let c = -cMax; c <= cMax; c++) {
        const wx = c * G
        const uTop = MIN_U
        const uBottom = 1.1
        const uSide = wx === 0 ? uBottom : Math.min(uBottom, (cx * 1.1) / Math.abs(wx))
        if (uSide <= uTop) continue
        const nSeg = Math.max(1, Math.ceil((uSide - uTop) * 10))
        const colShimmer = shimmer(c, 1.3)
        let prevX = 0
        let prevY = 0
        for (let i = 0; i <= nSeg; i++) {
          const u = uTop + ((uSide - uTop) * i) / nSeg
          const z = Z0 / u
          const px = cx + wx * u + warpX(wx, z, u)
          const py = hy + d * u + warpY(wx, u)
          if (i > 0) {
            const um = u - (uSide - uTop) / nSeg / 2
            const alpha = base * colShimmer * horizonDepth(um) ** 2 * Math.min(1, (G * um) / SPACING_CAP_PX)
            if (alpha >= 0.002) {
              ctx.globalAlpha = alpha
              ctx.beginPath()
              ctx.moveTo(prevX, prevY)
              ctx.lineTo(px, py)
              ctx.stroke()
            }
          }
          prevX = px
          prevY = py
        }
      }
      ctx.restore()

      // Horizon haze, in screen space over the full canvas width: everything above the horizon is
      // erased outright, and below it the VISIBLE fraction is smoothstep(t)^1.8 (0 at the horizon,
      // rising slowly to 1 at FOG_BAND), so the grid emerges from nothing with no visible first
      // line. destination-out only reads alpha (no colour literal), so it holds in both schemes.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = colors.foreground
      ctx.globalAlpha = 1
      ctx.fillRect(0, 0, w, hy)
      const yEnd = hy + h * FOG_BAND
      for (let y = hy; y < yEnd; y += 2) {
        ctx.globalAlpha = 1 - hazeVisible(y + 1, h)
        ctx.fillRect(0, y, w, 2)
      }
      ctx.globalCompositeOperation = 'source-over'
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
