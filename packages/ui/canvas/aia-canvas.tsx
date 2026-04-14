'use client'

import { type ReactNode, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AIAContext,
  type AIAContextValue,
  type CanvasPhase,
  type RingRegistration,
  type SphereRegistration
} from './aia-context'
import { BG_RENDERERS, type BgEvent, type BgRenderer, type BgVariant } from './bg'
import { MATRIX_CHARS } from './shared/constants'
import { getThemeColors } from './shared/colors'

// Frames for forming → settled transition (~1s at 60fps)
const FORM_DURATION = 60

// Simplified — no vx/vy (wander removed), no ambient flag
interface Particle {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  baseOpacity: number
  angle: number
  cluster: number // index into current spheres array
}

interface DirectMessage {
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  toSphereId: string
}

interface MatrixDrop {
  x: number
  y: number
  speed: number
  char: string
  life: number
  color: string
}

export interface AIACanvasRef {
  forceSettle: () => void
}

interface AIACanvasProps {
  children: ReactNode
  bg?: BgVariant | BgRenderer
  className?: string
  onPhaseChange?: (phase: CanvasPhase) => void
  wanderDuration?: number
  alwaysRenderSpheres?: boolean
  matchContentHeight?: boolean
  /**
   * When true (default), gravity ramp starts automatically when the canvas
   * enters the settled phase. Set to false when you want to trigger gravity
   * manually via ctx.startGravity() — e.g. after a ring simulation completes.
   */
  autoTriggerGravity?: boolean
  ref?: React.Ref<AIACanvasRef>
}

export function AIACanvas({
  children,
  bg,
  className,
  onPhaseChange,
  wanderDuration,
  alwaysRenderSpheres = false,
  matchContentHeight = false,
  autoTriggerGravity = true,
  ref
}: AIACanvasProps) {
  const matchContentHeightRef = useRef(matchContentHeight)
  matchContentHeightRef.current = matchContentHeight
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onPhaseChangeRef = useRef<((phase: CanvasPhase) => void) | undefined>(onPhaseChange)
  onPhaseChangeRef.current = onPhaseChange
  const spheresRef = useRef<Map<string, SphereRegistration>>(new Map())
  const ringsRef = useRef<Map<string, RingRegistration>>(new Map())
  const [phase, setPhase] = useState<CanvasPhase>('wander')

  const directMessagesRef = useRef<DirectMessage[]>([])
  const forceSettleSignal = useRef(false)
  const wanderDurationRef = useRef(wanderDuration ?? 120)
  const alwaysRenderSpheresRef = useRef(alwaysRenderSpheres)
  alwaysRenderSpheresRef.current = alwaysRenderSpheres

  // bg and recentEvents — accessed via refs inside the rAF loop
  const bgRef = useRef<BgVariant | BgRenderer | undefined>(bg)
  bgRef.current = bg
  const recentEventsRef = useRef<BgEvent[]>([])

  // Gravity trigger — set by startGravity() from context, read inside rAF loop
  const startGravitySignalRef = useRef(false)
  const autoTriggerGravityRef = useRef(autoTriggerGravity)
  autoTriggerGravityRef.current = autoTriggerGravity

  const startGravity = useCallback(() => {
    startGravitySignalRef.current = true
    // Queue ring-closed event for the next frame's bg renderer
    // cx/cy are unknown here (no canvas dims in React) — fabric.ts reads from rings[0] or W/2,H/2
    recentEventsRef.current.push({ type: 'ring-closed', cx: 0, cy: 0 })
  }, [])

  const registerSphere = useCallback((reg: SphereRegistration) => {
    spheresRef.current.set(reg.id, reg)
  }, [])

  const updateSphere = useCallback((id: string, updates: Partial<SphereRegistration>) => {
    const existing = spheresRef.current.get(id)
    if (existing) spheresRef.current.set(id, { ...existing, ...updates })
  }, [])

  const unregisterSphere = useCallback((id: string) => {
    spheresRef.current.delete(id)
  }, [])

  const registerRing = useCallback((reg: RingRegistration) => {
    ringsRef.current.set(reg.id, reg)
  }, [])

  const updateRing = useCallback((id: string, updates: Partial<RingRegistration>) => {
    const existing = ringsRef.current.get(id)
    if (existing) ringsRef.current.set(id, { ...existing, ...updates })
  }, [])

  const unregisterRing = useCallback((id: string) => {
    ringsRef.current.delete(id)
  }, [])

  const fireDirectedMessage = useCallback((fromId: string, toId: string) => {
    const spheres = Array.from(spheresRef.current.values())
    const fromSphere = spheres.find((s) => s.id.toLowerCase() === fromId.toLowerCase())
    const toSphere = spheres.find((s) => s.id.toLowerCase() === toId.toLowerCase())
    if (!fromSphere || !toSphere) return
    directMessagesRef.current.push({
      fromX: fromSphere.x,
      fromY: fromSphere.y,
      toX: toSphere.x,
      toY: toSphere.y,
      progress: 0,
      toSphereId: toId
    })
    // Notify bg renderers this frame
    recentEventsRef.current.push({ type: 'message-fired', fromId, toId })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      forceSettle: () => {
        forceSettleSignal.current = true
      }
    }),
    []
  )

  const contextValue: AIAContextValue = {
    registerSphere,
    updateSphere,
    unregisterSphere,
    registerRing,
    updateRing,
    unregisterRing,
    phase,
    containerRef,
    fireDirectedMessage,
    startGravity
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = 0
    let height = 0
    let particles: Particle[] = []
    let particleSphereIds: string[] = []
    const colors = getThemeColors()
    const dpr = window.devicePixelRatio || 1
    let time = 0
    let currentPhase: CanvasPhase = 'wander'
    let formingStart = 0
    let settleProgress = 0
    // settleProgress rises in two stages:
    //   forming  (FORM_DURATION frames):  0 → 0.4  — fabric shows first curve as ring appears
    //   settled  (SETTLE_RAMP frames):    0.4 → 1  — fabric builds to full effect through sphere animation
    let gravityStart = -1
    const SETTLE_RAMP = 360 // ~6s at 60fps — slow, graceful ramp once triggered

    let ringCompletion = 0
    let ringEnvoyProgress = 0
    let ringEnvoyActive = false

    const matrixDrops = new Map<string, MatrixDrop[]>()
    const clusterGlow = new Map<string, number>()

    interface RingChar {
      x: number
      y: number
      char: string
      life: number
      speed: number
      color: string
    }
    const ringChars = new Map<string, RingChar[]>()

    function resize() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      width = rect.width
      height = matchContentHeightRef.current ? Math.max(rect.height, containerRef.current.scrollHeight) : rect.height
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Creates particles from each sphere's own particleCount.
    // Called when the registered sphere set changes.
    function createParticles() {
      particles = []
      const spheres = Array.from(spheresRef.current.values())
      particleSphereIds = spheres.map((s) => s.id)
      spheres.forEach((sphere, idx) => {
        for (let i = 0; i < sphere.particleCount; i++) {
          const a = Math.random() * Math.PI * 2
          const r = sphere.radius * (0.9 + Math.random() * 0.3)
          particles.push({
            x: sphere.x + Math.cos(a) * r,
            y: sphere.y + Math.sin(a) * r,
            radius: Math.random() * 2 + 0.5,
            color: sphere.color,
            opacity: 0,
            baseOpacity: Math.random() * 0.25 + 0.2,
            angle: a,
            cluster: idx
          })
        }
      })
    }

    // Direct positioning — particles orbit their sphere every frame.
    function updateClusterOrbit(p: Particle, target: { x: number; y: number }, clusterRadius: number) {
      p.angle += (Math.random() - 0.5) * 0.003
      p.x = target.x + Math.cos(p.angle) * clusterRadius + (Math.random() - 0.5) * 0.3
      p.y = target.y + Math.sin(p.angle) * clusterRadius + (Math.random() - 0.5) * 0.3
    }

    function updateMatrixDropsForSphere(sphereId: string, sphere: SphereRegistration, _glowLevel: number) {
      if (!sphere.showMatrix || sphere.state === 'idle') return

      let drops = matrixDrops.get(sphereId)
      if (!drops) {
        drops = []
        matrixDrops.set(sphereId, drops)
      }

      const clipR = sphere.radius - 4
      const spawnRate = sphere.state === 'speaking' ? 0.8 : 0.4

      if (Math.random() < spawnRate) {
        const xOffset = (Math.random() - 0.5) * clipR * 1.6
        const palette = sphere.matrixColors ?? [sphere.color]
        drops.push({
          x: sphere.x + xOffset,
          y: sphere.y - clipR,
          speed: 0.4 + Math.random() * 0.6,
          char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!,
          life: 1,
          color: palette[Math.floor(Math.random() * palette.length)]!
        })
      }

      ctx!.save()
      ctx!.beginPath()
      ctx!.arc(sphere.x, sphere.y, clipR, 0, Math.PI * 2)
      ctx!.clip()

      for (let d = drops.length - 1; d >= 0; d--) {
        const drop = drops[d]!
        drop.y += drop.speed
        const vertProgress = (drop.y - (sphere.y - clipR)) / (clipR * 2)
        drop.life = 1 - vertProgress
        if (Math.random() < 0.05) {
          drop.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!
        }
        if (drop.y > sphere.y + clipR || drop.life <= 0) {
          drops.splice(d, 1)
          continue
        }
        const intensity = sphere.state === 'complete' ? 0.45 : 0.85
        ctx!.globalAlpha = Math.max(0.3, drop.life) * intensity * (sphere.matrixOpacity ?? 1)
        ctx!.fillStyle = drop.color
        ctx!.font = '12px monospace'
        ctx!.textAlign = 'center'
        ctx!.fillText(drop.char, drop.x, drop.y)
      }
      ctx!.restore()
    }

    function animate() {
      time++
      ctx!.globalAlpha = 1
      ctx!.clearRect(0, 0, width, height)

      // Auto-resize when content height changes
      if (containerRef.current) {
        const newHeight = Math.max(
          containerRef.current.getBoundingClientRect().height,
          containerRef.current.scrollHeight
        )
        if (Math.abs(newHeight - height) > 10) resize()
      }

      const spheres = Array.from(spheresRef.current.values())
      const rings = Array.from(ringsRef.current.values())

      // Capture and clear recentEvents for this frame
      const frameEvents = recentEventsRef.current.slice()
      recentEventsRef.current = []

      // ── Background renderer (runs first, behind everything) ────────────────
      const bgProp = bgRef.current
      const bgRenderer: BgRenderer | null | undefined =
        typeof bgProp === 'function' ? bgProp : bgProp ? BG_RENDERERS[bgProp] : null
      if (bgRenderer) {
        bgRenderer({
          ctx: ctx!,
          t: time,
          W: width,
          H: height,
          phase: currentPhase,
          settleProgress,
          rings,
          spheres,
          recentEvents: frameEvents
        })
      }

      // ── Phase machine — time-based ─────────────────────────────────────────
      if (currentPhase === 'wander') {
        const shouldForce = forceSettleSignal.current && spheres.length > 0
        const shouldAutoForm = time > wanderDurationRef.current && spheres.length > 0
        if (shouldForce || shouldAutoForm) {
          if (shouldForce) {
            // Skip forming entirely, go straight to settled
            currentPhase = 'settled'
            gravityStart = time
            settleProgress = 1
            setPhase('settled')
            onPhaseChangeRef.current?.('settled')
          } else {
            currentPhase = 'forming'
            formingStart = time
            setPhase('forming')
            onPhaseChangeRef.current?.('forming')
          }
          forceSettleSignal.current = false
        }
      }
      if (currentPhase === 'forming') {
        const elapsed = time - formingStart
        if (elapsed >= FORM_DURATION) {
          currentPhase = 'settled'
          // Auto-trigger gravity when settled starts (for pages without explicit trigger)
          if (autoTriggerGravityRef.current) gravityStart = time
          setPhase('settled')
          onPhaseChangeRef.current?.('settled')
        }
      }

      // Pick up external startGravity() calls (e.g. from ring animation complete)
      if (startGravitySignalRef.current) {
        gravityStart = time
        startGravitySignalRef.current = false
      }

      // Gravity ramp — cubic ease-in-out, starts from gravityStart
      // Starts slow, accelerates through the middle, then settles gradually.
      if (gravityStart >= 0) {
        const progress = Math.min(1, (time - gravityStart) / SETTLE_RAMP)
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
        settleProgress = eased
      }

      // ── Ring envoy ─────────────────────────────────────────────────────────
      for (const ring of rings) {
        if (currentPhase !== 'settled') continue
        if (!ringEnvoyActive && ringCompletion < ring.sphereCount) {
          ringEnvoyActive = true
          ringEnvoyProgress = 0
        }
        if (ringEnvoyActive) {
          ringEnvoyProgress += 0.015
          if (ringEnvoyProgress >= 1) {
            ringEnvoyProgress = 0
            ringCompletion++
            if (ringCompletion >= ring.sphereCount) ringEnvoyActive = false
          }
        }
      }

      // ── Per-sphere particle system ─────────────────────────────────────────
      // Recreate particle pool when sphere set changes
      if (spheres.length > 0) {
        const currentIds = spheres.map((s) => s.id)
        const idsChanged =
          currentIds.length !== particleSphereIds.length || currentIds.some((id, i) => id !== particleSphereIds[i])
        if (idsChanged) createParticles()
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!
        if (p.opacity < p.baseOpacity) p.opacity += 0.003

        const sphere = spheres[p.cluster]
        if (!sphere) continue

        updateClusterOrbit(p, sphere, sphere.radius)

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.opacity
        ctx!.fill()
      }

      // ── Directed messages ──────────────────────────────────────────────────
      for (let i = directMessagesRef.current.length - 1; i >= 0; i--) {
        const msg = directMessagesRef.current[i]!
        msg.progress += 0.07

        const t = Math.min(msg.progress, 1)
        const ease = t * t * (3 - 2 * t)

        const headX = msg.fromX + (msg.toX - msg.fromX) * ease
        const headY = msg.fromY + (msg.toY - msg.fromY) * ease

        const trailLen = 14
        for (let s = 1; s <= trailLen; s++) {
          const tTrail = Math.max(0, t - s * 0.04)
          const eTrail = tTrail * tTrail * (3 - 2 * tTrail)
          const tx = msg.fromX + (msg.toX - msg.fromX) * eTrail
          const ty = msg.fromY + (msg.toY - msg.fromY) * eTrail
          ctx!.globalAlpha = (1 - s / trailLen) * 0.5
          ctx!.fillStyle = colors[0]!
          ctx!.beginPath()
          ctx!.arc(tx, ty, Math.max(0.5, 2.5 - s * 0.15), 0, Math.PI * 2)
          ctx!.fill()
        }

        const dg = ctx!.createRadialGradient(headX, headY, 0, headX, headY, 14)
        dg.addColorStop(0, '#ffffff')
        dg.addColorStop(0.3, colors[0]!)
        dg.addColorStop(1, 'transparent')
        ctx!.globalAlpha = 0.9
        ctx!.fillStyle = dg
        ctx!.beginPath()
        ctx!.arc(headX, headY, 14, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.globalAlpha = 1
        ctx!.fillStyle = '#ffffff'
        ctx!.beginPath()
        ctx!.arc(headX, headY, 3, 0, Math.PI * 2)
        ctx!.fill()

        if (msg.progress >= 1) {
          const toSphere = spheres.find((s) => s.id === msg.toSphereId)
          if (toSphere) clusterGlow.set(toSphere.id, 1)
          directMessagesRef.current.splice(i, 1)
        }
      }

      // ── Sphere glow + matrix rain ──────────────────────────────────────────
      if (currentPhase !== 'wander' || alwaysRenderSpheresRef.current) {
        for (const sphere of spheres) {
          const glow = clusterGlow.get(sphere.id) ?? 0
          if (glow > 0.01) {
            const r = sphere.radius + 15
            const g = ctx!.createRadialGradient(sphere.x, sphere.y, 0, sphere.x, sphere.y, r)
            g.addColorStop(0, colors[0]!)
            g.addColorStop(0.6, colors[1]!)
            g.addColorStop(1, 'transparent')
            ctx!.globalAlpha = glow * 0.3
            ctx!.fillStyle = g
            ctx!.beginPath()
            ctx!.arc(sphere.x, sphere.y, r, 0, Math.PI * 2)
            ctx!.fill()
            clusterGlow.set(sphere.id, glow * 0.96)
          }
          updateMatrixDropsForSphere(sphere.id, sphere, glow)
        }
      }

      // ── Ring matrix rain ───────────────────────────────────────────────────
      for (const ring of rings) {
        if (!ring.thinking) continue
        let chars = ringChars.get(ring.id)
        if (!chars) {
          chars = []
          ringChars.set(ring.id, chars)
        }

        const clipR = ring.radius
        if (Math.random() < 0.8) {
          const xOffset = (Math.random() - 0.5) * clipR * 1.8
          chars.push({
            x: ring.centerX + xOffset,
            y: ring.centerY - clipR,
            speed: 0.8 + Math.random() * 1.2,
            char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!,
            life: 1,
            color:
              spheres.length > 0
                ? spheres[Math.floor(Math.random() * spheres.length)]!.color
                : colors[Math.floor(Math.random() * colors.length)]!
          })
        }

        ctx!.save()
        ctx!.beginPath()
        ctx!.arc(ring.centerX, ring.centerY, clipR, 0, Math.PI * 2)
        ctx!.clip()
        ctx!.font = '12px monospace'
        ctx!.textAlign = 'center'

        for (let i = chars.length - 1; i >= 0; i--) {
          const c = chars[i]!
          c.y += c.speed
          const vertProgress = (c.y - (ring.centerY - clipR)) / (clipR * 2)
          c.life = 1 - vertProgress
          if (Math.random() < 0.05) {
            c.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!
          }
          if (c.y > ring.centerY + clipR || c.life <= 0) {
            chars.splice(i, 1)
            continue
          }
          ctx!.globalAlpha = Math.max(0.3, c.life) * 0.85 * (ring.matrixOpacity ?? 1)
          ctx!.fillStyle = c.color
          ctx!.fillText(c.char, c.x, c.y)
        }
        ctx!.restore()
      }

      ctx!.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }

    resize()
    animate()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <AIAContext.Provider value={contextValue}>
      <div ref={containerRef} className={`relative w-full ${className ?? ''}`}>
        <canvas ref={canvasRef} className='absolute inset-0 z-0 pointer-events-none overflow-hidden' />
        <div className='relative z-[1]'>{children}</div>
      </div>
    </AIAContext.Provider>
  )
}
