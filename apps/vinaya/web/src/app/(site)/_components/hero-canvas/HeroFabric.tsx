'use client'

// Reuses @atta/ui's REAL fabric renderer (createFabricRenderer — the same one Vāda's
// home uses: subtle mesh, gravity curvature, and the ClosingPulse that MOVES the mesh)
// but drives it from a local, contained canvas so the hero can be a normal in-flow
// section (scrolls away) rather than a fixed overlay. All colors come from the theme
// inside the renderer; we only feed it geometry.
//
// The renderer funnels its curvature to the registered ring's center, so we pass a ring
// at main's local position (rect-minus-canvas) — keeping curvature + shock wave on main.

import '@atta/ui/canvas.css'
import { createFabricRenderer } from '@atta/ui/canvas'
import type { BgState } from '@atta/ui/canvas'
import { useEffect, useRef } from 'react'

const renderFabric = createFabricRenderer({
  approachSpeedMultiplier: 0.8,
  forceCompleteAtSphereEdge: false,
  shockWaveOnArrival: true,
  // Curvature radiates from main OUTWARD (in step with the shock wave) instead of the
  // whole grid folding at once — driven by a slow settleProgress ramp synced to the pulse.
  radialFold: true
})

export function HeroFabric({
  centerRef,
  gravity,
  pulseKey
}: {
  centerRef: React.RefObject<HTMLElement | null>
  gravity: number // 0→1 curvature-fold intensity (settleProgress)
  pulseKey: number // increment to fire a shock wave (ClosingPulse)
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gravityRef = useRef(gravity)
  gravityRef.current = gravity
  const lastKey = useRef(0)
  const fire = useRef(false)

  useEffect(() => {
    if (pulseKey > lastKey.current) {
      lastKey.current = pulseKey
      fire.current = true
    }
  }, [pulseKey])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let t = 0
    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // main's center in the canvas's own coords (scroll-safe — rect minus rect).
      const cRect = canvas.getBoundingClientRect()
      const mRect = centerRef.current?.getBoundingClientRect()
      const cx = mRect ? mRect.left + mRect.width / 2 - cRect.left : w / 2
      const cy = mRect ? mRect.top + mRect.height / 2 - cRect.top : h / 2
      const R = Math.min(w, h) * 0.34

      const recentEvents: BgState['recentEvents'] = []
      if (fire.current) {
        fire.current = false
        recentEvents.push({ type: 'ring-closed', cx, cy })
      }

      const state: BgState = {
        ctx,
        t,
        W: w,
        H: h,
        phase: 'settled',
        settleProgress: Math.max(0, Math.min(1, gravityRef.current)),
        rings: [
          {
            id: 'main',
            centerX: cx,
            centerY: cy,
            radius: R,
            style: 'none',
            spherePositions: [],
            sphereCount: 0,
            thinking: false
          }
        ],
        spheres: [],
        recentEvents
      }
      renderFabric(state)
      t++
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [centerRef])

  return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />
}
