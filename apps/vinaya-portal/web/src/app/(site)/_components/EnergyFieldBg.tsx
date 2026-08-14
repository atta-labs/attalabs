'use client'

import { useEffect, useRef } from 'react'
import { readThemeColors } from './canvas/theme-colors'

// A calm "fabric of the universe" layer that lives BEHIND a section's content (absolute,
// transparent, pointer-events-none). A warped grid + slow drifting particles, and — the
// magic — grid nodes/lines that IGNITE with energy as the cursor passes over them, plus a
// soft halo trailing the pointer. All colors come from theme tokens (no hardcoded values),
// and it renders a single static frame under prefers-reduced-motion.
const GRID = 74 // px between grid nodes
const IGNITE_RADIUS = 150 // energy reach around the cursor
const PARTICLE_COUNT = 26

// Deterministic 0..1 from an integer seed — stable particle field, no per-frame jitter.
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// `showGrid=false` skips the faint base mesh (only the cursor-reactive energy + particles
// render) — used over the hero, which already draws its own fabric mesh.
export function EnergyFieldBg({ particles = true, showGrid = true }: { particles?: boolean; showGrid?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let colors = readThemeColors(canvas)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let t = 0

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      mouse.current = { x, y, active: x >= 0 && y >= 0 && x <= r.width && y <= r.height }
    }
    window.addEventListener('mousemove', onMove)

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const cols = Math.ceil(w / GRID) + 1
      const rows = Math.ceil(h / GRID) + 1
      const cw = w / (cols - 1)
      const ch = h / (rows - 1)
      const warp = (gx: number, gy: number) => ({
        x: gx * cw + Math.sin(gy * 0.6 + t * 0.008) * 4,
        y: gy * ch + Math.cos(gx * 0.5 + t * 0.006) * 4
      })
      const m = mouse.current
      const energyAt = (px: number, py: number) => {
        if (!m.active) return 0
        const d = Math.hypot(px - m.x, py - m.y)
        return d > IGNITE_RADIUS ? 0 : 1 - d / IGNITE_RADIUS
      }

      // --- warped grid (own invented mesh) — ONLY when showGrid: over the hero we don't
      // draw any lines of our own (the real fabric's lines light up instead); we keep just
      // the dots + halo below. ---
      if (showGrid) {
        ctx.strokeStyle = colors.mutedForeground
        ctx.lineWidth = 0.7
        const drawSeg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
          const e = Math.max(energyAt(a.x, a.y), energyAt(b.x, b.y))
          ctx.globalAlpha = 0.05 + e * 0.5
          if (e > 0.15) ctx.strokeStyle = colors.primary
          else ctx.strokeStyle = colors.mutedForeground
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = warp(c, r)
            if (c < cols - 1) drawSeg(p, warp(c + 1, r))
            if (r < rows - 1) drawSeg(p, warp(c, r + 1))
          }
        }
      }

      // --- energized nodes + filaments — ONLY over our own invented grid (showGrid). Over
      // the real fabric the node dots are drawn on the actual grid corners by the fabric
      // renderer itself, so we don't add a mismatched floating set here; just the halo. ---
      if (m.active) {
        if (showGrid) {
          ctx.fillStyle = colors.primary
          ctx.strokeStyle = colors.primary
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const p = warp(c, r)
              const e = energyAt(p.x, p.y)
              if (e <= 0.05) continue
              ctx.globalAlpha = e * 0.9
              ctx.beginPath()
              ctx.arc(p.x, p.y, 1 + e * 1.6, 0, Math.PI * 2)
              ctx.fill()
              // filament back to the pointer
              ctx.globalAlpha = e * e * 0.5
              ctx.lineWidth = 0.8
              ctx.beginPath()
              ctx.moveTo(p.x, p.y)
              ctx.lineTo(m.x, m.y)
              ctx.stroke()
            }
          }
        }
        // soft halo at the pointer — stepped alpha so it never muds on the cream bg
        ctx.fillStyle = colors.primary
        for (const [rr, aa] of [
          [46, 0.05],
          [26, 0.06],
          [12, 0.08]
        ] as const) {
          ctx.globalAlpha = aa
          ctx.beginPath()
          ctx.arc(m.x, m.y, rr, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // --- slow drifting particles (deterministic; ignite near the cursor too) ---
      if (particles) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const px = hash01(i) * w
          const drift = (hash01(i + 91) * h + t * (0.5 + hash01(i) * 0.7)) % h
          const py = h - drift
          const e = energyAt(px, py)
          ctx.globalAlpha = 0.16 + e * 0.6
          ctx.fillStyle = e > 0.2 ? colors.primary : colors.mutedForeground
          ctx.beginPath()
          ctx.arc(px, py, 0.9 + hash01(i + 7) * 1.1 + e * 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      if (!reduce) {
        t++
        raf = requestAnimationFrame(render)
      }
    }

    raf = requestAnimationFrame(render)

    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(canvas)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      themeObserver.disconnect()
    }
  }, [particles, showGrid])

  return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />
}
