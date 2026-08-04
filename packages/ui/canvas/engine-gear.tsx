'use client'

// Engine's mark — one gear silhouette (13 teeth, single stroke, low/no fill) with a small
// axle hole at center. Canvas-drawn, no SVG. Reveal scales the gear in (ease-out) while its
// rotation ramps from stopped to a slow steady spin — it spins UP as it reveals, not just
// fades in. Composition (Step 7) draws this wide/low, letting the hero's bottom edge crop it
// so it reads as Engine's plinth/substrate rather than a peer-sized mark.

import { useEffect, useRef } from 'react'
import { withAlpha } from './shared/color-math'
import { resolveColor } from './shared/colors'
import { polar } from './shared/harness-geometry'
import { refreshThemeCache } from './shared/theme'

const TEETH = 13
const TIP_RATIO = 0.5 // fraction of each tooth's angular slot that is the flat tip
const EASE_OUT = (t: number) => 1 - (1 - t) ** 3
const MAX_SPIN_SPEED = 0.003 // rad/frame at full reveal

function gearPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number) {
  const slot = 360 / TEETH
  const halfTip = (slot * TIP_RATIO) / 2
  ctx.beginPath()
  for (let i = 0; i < TEETH; i++) {
    const center = i * slot
    const rootBefore = polar(cx, cy, innerR, center - slot / 2)
    const tipStart = polar(cx, cy, outerR, center - halfTip)
    const tipEnd = polar(cx, cy, outerR, center + halfTip)
    const rootAfter = polar(cx, cy, innerR, center + slot / 2)
    if (i === 0) ctx.moveTo(rootBefore.x, rootBefore.y)
    else ctx.lineTo(rootBefore.x, rootBefore.y)
    ctx.lineTo(tipStart.x, tipStart.y)
    ctx.lineTo(tipEnd.x, tipEnd.y)
    ctx.lineTo(rootAfter.x, rootAfter.y)
  }
  ctx.closePath()
}

function drawEngineGear(ctx: CanvasRenderingContext2D, w: number, h: number, revealProgress: number, rotation: number) {
  if (revealProgress <= 0.001) return
  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) / 2
  const outerR = R * 0.86
  const innerR = R * 0.7
  const axleR = R * 0.24

  const primary = resolveColor('var(--primary)')
  const background = resolveColor('var(--background)')
  const scale = 0.7 + 0.3 * EASE_OUT(revealProgress)

  ctx.save()
  ctx.globalAlpha = revealProgress
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)

  gearPath(ctx, cx, cy, outerR, innerR)
  ctx.fillStyle = withAlpha(primary, 0.04)
  ctx.fill()
  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Axle — a cut-out hole at center.
  ctx.beginPath()
  ctx.arc(cx, cy, axleR, 0, Math.PI * 2)
  ctx.fillStyle = background
  ctx.fill()
  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

export function EngineGear({ revealProgress }: { revealProgress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef(revealProgress)
  revealRef.current = revealProgress

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let rotation = 0

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
      const reveal = revealRef.current
      // Spin speed ramps with reveal — stopped at 0, full slow spin once fully revealed.
      rotation += MAX_SPIN_SPEED * EASE_OUT(reveal)
      if (w > 0 && h > 0) drawEngineGear(ctx, w, h, reveal, rotation)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />
}
