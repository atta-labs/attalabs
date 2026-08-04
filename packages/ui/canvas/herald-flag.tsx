'use client'

// Herald's mark — a single-stroke flag silhouette inside a sphere shell matching
// AIASphere's visual language (border stroke, primary-tinted glow), canvas-drawn so
// "no SVG anywhere" holds across every mark. No matrix rain, no particles — this mark
// reads by its own procedural cloth ripple, not by borrowing AIASphere's effects.
// Reveal unfurls the flag left→right (a clip on flag width), it does not fade in.

import { useEffect, useRef } from 'react'
import { withAlpha } from './shared/color-math'
import { resolveColor } from './shared/colors'
import { refreshThemeCache } from './shared/theme'

// y = baseY + sin(fracX·5 − t·0.05 + edgePhase) · (1 − fracX·0.3) · (r·0.1)
// Amplitude decays toward the fly edge (1 − fracX·0.3) so the cloth reads as anchored
// at the pole (fracX=0) and loosest at its free edge.
function rippleY(baseY: number, fracX: number, t: number, r: number, edgePhase: number): number {
  return baseY + Math.sin(fracX * 5 - t * 0.05 + edgePhase) * (1 - fracX * 0.3) * (r * 0.1)
}

function drawHeraldFlag(ctx: CanvasRenderingContext2D, w: number, h: number, revealProgress: number, t: number) {
  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) / 2

  const border = resolveColor('var(--border)')
  const primary = resolveColor('var(--primary)')

  // Sphere shell — thin border ring + soft primary glow, matching AIASphere's language.
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
  glow.addColorStop(0, withAlpha(primary, 0.12))
  glow.addColorStop(1, withAlpha(primary, 0))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = withAlpha(border, 0.8)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2)
  ctx.stroke()

  if (revealProgress <= 0.001) return

  // Pole — vertical, slightly left of center.
  const poleX = cx - R * 0.42
  const poleTop = cy - R * 0.55
  const poleBottom = cy + R * 0.6
  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(poleX, poleTop)
  ctx.lineTo(poleX, poleBottom)
  ctx.stroke()

  // Flag — cloth silhouette from the pole out to flagWidth, unfurled by clipping fracX
  // to [0, revealProgress] rather than fading.
  const flagWidth = R * 1.05
  const topBaseY = cy - R * 0.42
  const bottomBaseY = cy - R * 0.02
  const samples = 24
  const shown = Math.max(1, Math.round(samples * revealProgress))

  const topPts: { x: number; y: number }[] = []
  const bottomPts: { x: number; y: number }[] = []
  for (let i = 0; i <= shown; i++) {
    const fracX = (i / samples) * revealProgress
    const x = poleX + fracX * flagWidth
    topPts.push({ x, y: rippleY(topBaseY, fracX, t, R, 0) })
    bottomPts.push({ x, y: rippleY(bottomBaseY, fracX, t, R, Math.PI * 0.3) })
  }

  ctx.beginPath()
  const firstTop = topPts[0]
  if (firstTop) ctx.moveTo(firstTop.x, firstTop.y)
  for (const p of topPts.slice(1)) ctx.lineTo(p.x, p.y)
  for (const p of [...bottomPts].reverse()) ctx.lineTo(p.x, p.y)
  ctx.closePath()
  ctx.fillStyle = withAlpha(primary, 0.06)
  ctx.fill()
  ctx.strokeStyle = primary
  ctx.lineWidth = 1.75
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function HeraldFlag({ revealProgress }: { revealProgress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef(revealProgress)
  revealRef.current = revealProgress

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let t = 0

    const render = () => {
      refreshThemeCache()
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (w > 0 && h > 0) drawHeraldFlag(ctx, w, h, revealRef.current, t)
      t++
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />
}
