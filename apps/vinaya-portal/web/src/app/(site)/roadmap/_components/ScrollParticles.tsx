'use client'

import { useEffect, useRef } from 'react'
import { readThemeColors } from '../../_components/canvas/theme-colors'
import { findScrollParent } from '../_lib/scroll-signal'

// Drifting squares over the fabric (the design's numbers): 18 outlined squares (`strokeRect`,
// not filled), 4-9px, alpha 0.16, each swaying +-3px horizontally on a 9-15s sine, and
// parallax 0.5 — they travel 50px per 100px of scroll, faster than the fabric (0.2) and slower
// than the content (1), so the three read as three depths. A roadmap-local 2D canvas, not
// `floaters.js` (three.js; this route has no WebGL context). Viewport-fixed, so its size is
// bounded; each square lives at a fixed world position spread over half the scroll length
// plus one screen, so squares keep arriving as the page scrolls. Theme colour via
// `readThemeColors`, re-read on a theme switch. Visible from the top; fades out as the track
// leaves the viewport. Under reduced motion: one still frame, no sway, no parallax.
const COUNT = 18
const TAU = Math.PI * 2

// Deterministic 0..1 from an int, so the layout is the same on every mount.
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const SQUARES = Array.from({ length: COUNT }, (_, i) => ({
  fx: hash01(i * 7 + 1),
  fy: hash01(i * 7 + 2),
  size: 4 + hash01(i * 7 + 3) * 5,
  rot: hash01(i * 7 + 4) * Math.PI,
  phase: hash01(i * 7 + 5) * TAU,
  period: 9 + hash01(i * 7 + 6) * 6
}))

export function ScrollParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const host = canvas?.parentElement
    if (!canvas || !ctx || !host) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scroller = findScrollParent(canvas)
    const readScroll = () => (scroller ? scroller.scrollTop : document.documentElement.scrollTop)
    const maxScroll = () =>
      scroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - document.documentElement.clientHeight

    let colors = readThemeColors(canvas)
    let raf = 0

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
      const scrolled = reduce ? 0 : readScroll()
      // Fades out as the track's end approaches the top of the screen (the footer takes over).
      const hostBottom = host.getBoundingClientRect().bottom
      const onScreen = Math.min(1, Math.max(0, hostBottom / (window.innerHeight * 0.4)))
      const worldH = maxScroll() * 0.5 + h
      ctx.strokeStyle = colors.foreground
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.16 * onScreen
      for (const q of SQUARES) {
        const y = q.fy * worldH - scrolled * 0.5
        if (y < -20 || y > h + 20) continue
        const x = q.fx * w + (reduce ? 0 : 3 * Math.sin((TAU * t) / q.period + q.phase))
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(q.rot)
        ctx.strokeRect(-q.size / 2, -q.size / 2, q.size, q.size)
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      draw(now)
    }

    const redraw = () => draw(performance.now())
    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(canvas)
      redraw()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', redraw)
    redraw()
    if (!reduce) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      window.removeEventListener('resize', redraw)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className='pointer-events-none fixed inset-0 size-full' />
}
