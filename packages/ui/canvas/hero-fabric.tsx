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
import { createFabricRenderer, refreshThemeCache } from '@atta/ui/canvas'
import type { BgState, FabricConfig } from '@atta/ui/canvas'
import { useEffect, useRef } from 'react'

const FABRIC_CONFIG = {
  approachSpeedMultiplier: 0.8,
  forceCompleteAtSphereEdge: false,
  shockWaveOnArrival: true,
  // Curvature radiates from main OUTWARD (in step with the shock wave) instead of the
  // whole grid folding at once — driven by a slow settleProgress ramp synced to the pulse.
  radialFold: true,
  // Push the shock wave all the way to the screen edges before it fades.
  pulseReach: 2.4,
  // Grid-agent electrons handled in the harness SVG instead (branching lightning), so the
  // fabric stays a clean texture with only the cursor-lighten + drifting dots.
  gridAgents: false
} as const

export function HeroFabric({
  centerRef,
  gravity = 0,
  pulseKey = 0,
  emitAngles,
  emitRadiusRatio = 0.875,
  config
}: {
  centerRef?: React.RefObject<HTMLElement | null> // omit → curvature centers on the viewport
  gravity?: number // 0→1 curvature-fold intensity (settleProgress); 0 = flat mesh
  pulseKey?: number // increment to fire a shock wave (ClosingPulse)
  // Angles (radians) of the harness's electricity arcs — grid agents are BORN at these
  // points on the ring so they emanate from the electricity, not a generic ring edge.
  emitAngles?: number[]
  // Fraction of the ring's half-width where the electricity sits (rMid ≈ 0.875·c).
  emitRadiusRatio?: number
  // Overrides merged onto the default config (e.g. `gravityMultiplier: 0` to keep the mesh
  // flat where the curvature fold would be wrong). Read once, at mount.
  config?: Partial<FabricConfig>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Own renderer per instance → own gridAgent state (keyed by config), so the hero, Workflow
  // and CTA fabric canvases never share/stomp each other's agents.
  const renderFabricRef = useRef<((s: BgState) => void) | null>(null)
  if (!renderFabricRef.current) renderFabricRef.current = createFabricRenderer({ ...FABRIC_CONFIG, ...config })
  const gravityRef = useRef(gravity)
  gravityRef.current = gravity
  const lastKey = useRef(0)
  const fire = useRef(false)
  const mouse = useRef({ x: 0, y: 0, active: false })

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

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      mouse.current = { x, y, active: x >= 0 && y >= 0 && x <= r.width && y <= r.height }
    }
    window.addEventListener('mousemove', onMove)
    const render = () => {
      refreshThemeCache() // track html[data-theme] — we don't go through AIACanvas
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
      const mRect = centerRef?.current?.getBoundingClientRect()
      const cx = mRect ? mRect.left + mRect.width / 2 - cRect.left : w / 2
      const cy = mRect ? mRect.top + mRect.height / 2 - cRect.top : h / 2
      // Shadow sits just INSIDE the harness: outer ring radius (ringBox/2 × 0.93, matching
      // HarnessStructure's rOut) − 20px, so it reads slightly smaller than the metal ring.
      // Falls back to viewport-relative if no ring box.
      const R = mRect ? (mRect.width / 2) * 0.93 - 20 : Math.min(w, h) * 0.44

      // Electricity emitters — points on the ring at the harness's conduit angles, where the
      // grid agents are born. Only when the harness (centerRef) and its angles are present.
      const emitters =
        mRect && emitAngles
          ? emitAngles.map((a) => {
              const er = (mRect.width / 2) * emitRadiusRatio
              return { x: cx + Math.cos(a) * er, y: cy + Math.sin(a) * er }
            })
          : undefined

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
        recentEvents,
        pointer: mouse.current,
        emitters
      }
      renderFabricRef.current?.(state)
      t++
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [centerRef])

  return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />
}
