'use client'

import { useEffect, useRef } from 'react'
import { readThemeColors } from '../../_components/canvas/theme-colors'
import { HORIZON_Y, horizonDepth } from '../_lib/horizon'
import { findScrollParent } from '../_lib/scroll-signal'

// Drifting squares over the fabric (the design's numbers, but SOLID like the landing hero's and
// section 04's floating squares, which are filled point sprites, not the design's outlines): 18
// filled squares, 4-9px, at the hero's own strength (alpha 0.08 light / 0.12 dark), each swaying +-3px horizontally on a 9-15s sine, and
// parallax 0.5 — they travel 50px per 100px of scroll, faster than the fabric (0.2) and slower
// than the content (1), so the three read as three depths. A roadmap-local 2D canvas, not
// `floaters.js` (three.js; this route has no WebGL context). Viewport-fixed, so its size is
// bounded; each square lives at a fixed world position spread over half the scroll length
// plus one screen, so squares keep arriving as the page scrolls. Theme colour via
// `readThemeColors`, re-read on a theme switch. Visible from the top; fades out as the track
// leaves the viewport. Like the hero's floating squares they also FLOAT on their own, not only
// with the scroll: a slow vertical drift (20-30s periods, about 8px) on top of the horizontal
// sway, and a small cursor parallax (the hero tilts its camera a little with the pointer; here the
// layers shift slightly against it, bigger squares, which read as nearer, shifting more; smoothed
// at 0.05 per frame, no repulsion, as in the hero). Under reduced motion: one still frame, no
// sway, no drift, no pointer, no parallax. They read the fabric's horizon (`_lib/horizon.ts`):
// size and alpha scale 0.5..1 with the same depth factor, motion unchanged.
const COUNT = 18
const SQUARE_ALPHA_LIGHT = 0.08 // the hero's --hero-fabric-alpha per scheme
const SQUARE_ALPHA_DARK = 0.12
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
  period: 9 + hash01(i * 7 + 6) * 6,
  phaseY: hash01(i * 7 + 8) * TAU,
  periodY: 20 + hash01(i * 7 + 9) * 10
}))

const DRIFT_Y = 8 // px, the slow vertical float
const POINTER_SHIFT = 2.2 // px of cursor parallax per px of square size at the screen edge

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
    // Pointer offset from the viewport centre, -0.5 .. 0.5, eased toward the target each frame.
    let targetX = 0
    let targetY = 0
    let pointerX = 0
    let pointerY = 0
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      targetX = event.clientX / Math.max(1, window.innerWidth) - 0.5
      targetY = event.clientY / Math.max(1, window.innerHeight) - 0.5
    }
    const onLeave = () => {
      targetX = 0
      targetY = 0
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
      const scrolled = reduce ? 0 : readScroll()
      // Fades out as the track's end approaches the top of the screen (the footer takes over).
      const hostBottom = host.getBoundingClientRect().bottom
      const onScreen = Math.min(1, Math.max(0, hostBottom / (window.innerHeight * 0.4)))
      pointerX += (targetX - pointerX) * 0.05
      pointerY += (targetY - pointerY) * 0.05
      const worldH = maxScroll() * 0.5 + h
      const dark = document.documentElement.dataset.theme === 'dark'
      ctx.fillStyle = colors.foreground
      const squareAlpha = (dark ? SQUARE_ALPHA_DARK : SQUARE_ALPHA_LIGHT) * onScreen
      const horizonPx = h * HORIZON_Y
      for (const q of SQUARES) {
        const reach = POINTER_SHIFT * q.size
        const y =
          q.fy * worldH -
          scrolled * 0.5 +
          (reduce ? 0 : DRIFT_Y * Math.sin((TAU * t) / q.periodY + q.phaseY) + pointerY * reach)
        if (y < -20 || y > h + 20) continue
        const x = q.fx * w + (reduce ? 0 : 3 * Math.sin((TAU * t) / q.period + q.phase) + pointerX * reach)
        // The same horizon as the fabric: squares near it are smaller and fainter (0.5 .. 1).
        const depth = 0.5 + 0.5 * horizonDepth((y - horizonPx) / (h - horizonPx))
        const size = q.size * depth
        ctx.globalAlpha = squareAlpha * depth
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(q.rot)
        ctx.fillRect(-size / 2, -size / 2, size, size)
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
    if (!reduce) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    }
    redraw()
    if (!reduce) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      window.removeEventListener('resize', redraw)
      window.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className='pointer-events-none fixed inset-0 size-full' />
}
