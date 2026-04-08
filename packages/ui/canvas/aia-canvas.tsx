'use client'

import { type ReactNode, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AIAContext,
  type AIAContextValue,
  type CanvasPhase,
  type RingRegistration,
  type SphereRegistration
} from './aia-context'
import { renderLineRing } from './ring-styles/line'
import { renderParticleRing } from './ring-styles/particles'
import type { RingStyleRenderer } from './ring-styles/types'
import { renderWaveRing } from './ring-styles/wave'

const RING_RENDERERS: Record<string, RingStyleRenderer> = {
  wave: renderWaveRing,
  particles: renderParticleRing,
  line: renderLineRing
}

function getThemeColors(): string[] {
  if (typeof document === 'undefined') return ['#C8A84B', '#7A6A50', '#E8D5B7']
  const style = getComputedStyle(document.documentElement)
  const primary = style.getPropertyValue('--primary').trim() || '#C8A84B'
  const accent = style.getPropertyValue('--accent').trim() || '#C8A84B'
  const muted = style.getPropertyValue('--muted-foreground').trim() || '#7A6A50'
  const foreground = style.getPropertyValue('--foreground').trim() || '#E8D5B7'
  return [primary, accent, muted, foreground]
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
  baseOpacity: number
  angle: number
  cluster: number
  /** True = always wanders freely, never clusters to spheres */
  ambient: boolean
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
}

export interface AIACanvasRef {
  /** Force the canvas to immediately start clustering particles around registered spheres */
  forceSettle: () => void
}

interface AIACanvasProps {
  children: ReactNode
  particleCount?: number
  className?: string
  onPhaseChange?: (phase: CanvasPhase) => void
  /** How many frames before particles start clustering. Default 120. Set high to keep wander phase indefinitely. */
  wanderDuration?: number
  /** When true, sphere backgrounds and matrix rain render even during the wander phase. Default false. */
  alwaysRenderSpheres?: boolean
  /** Fraction of particles (0.0–1.0) that always wander freely and never cluster to spheres.
   *  Default 0 (all particles cluster). Set e.g. 0.6 for 60% ambient floaters + 40% sphere-bound. */
  ambientRatio?: number
  /** React 19 ref prop — exposes forceSettle() imperative API */
  ref?: React.Ref<AIACanvasRef>
}

const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789αβγδεζηθ∑∏∫∂λμπφψω'

export function AIACanvas({
  children,
  particleCount = 200,
  className,
  onPhaseChange,
  wanderDuration,
  alwaysRenderSpheres = false,
  ambientRatio = 0,
  ref
}: AIACanvasProps) {
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
  const ambientRatioRef = useRef(ambientRatio)
  ambientRatioRef.current = ambientRatio

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
    fireDirectedMessage
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
    const colors = getThemeColors()
    const dpr = window.devicePixelRatio || 1
    let time = 0
    let currentPhase: CanvasPhase = 'wander'
    let formingStart = 0

    let ringCompletion = 0
    let ringEnvoyProgress = 0
    let ringEnvoyActive = false
    // Sphere-bound particles are teleported to their sphere on the first frame spheres register,
    // so they appear inside their sphere from frame 1 (no visible drift-to-sphere animation)
    let particlesPositioned = false

    const matrixDrops = new Map<string, MatrixDrop[]>()
    const clusterGlow = new Map<string, number>()

    interface RingChar {
      x: number
      y: number
      char: string
      life: number
      speed: number
    }
    const ringChars = new Map<string, RingChar[]>()

    function resize() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function createParticles() {
      particles = []
      const spheres = Array.from(spheresRef.current.values())
      const clusterCount = Math.max(spheres.length, 1)
      const ambientCount = Math.floor(particleCount * ambientRatioRef.current)
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]!,
          opacity: 0,
          baseOpacity: Math.random() * 0.25 + 0.2,
          angle: Math.random() * Math.PI * 2,
          cluster: i % clusterCount,
          ambient: i < ambientCount
        })
      }
    }

    function updateWander(p: Particle) {
      p.vx += (Math.random() - 0.5) * 0.03
      p.vy += (Math.random() - 0.5) * 0.03
      p.vx *= 0.99
      p.vy *= 0.99
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.vx += 0.1
      if (p.x > width) p.vx -= 0.1
      if (p.y < 0) p.vy += 0.1
      if (p.y > height) p.vy -= 0.1
    }

    function updateToCluster(p: Particle, target: { x: number; y: number }) {
      // Each particle has a random delay before it starts moving (0–90 frames).
      // p.angle is already random (0–2π), so we reuse it as a cheap delay index.
      const delay = (p.angle / (Math.PI * 2)) * 90
      if (time - formingStart < delay) return
      // Wide speed range: small particles drift slowly, large ones rush — very staggered arrival
      const lerpFactor = 0.005 + (p.radius / 2.5) * 0.025
      p.x += (target.x - p.x) * lerpFactor + (Math.random() - 0.5) * 1.0
      p.y += (target.y - p.y) * lerpFactor + (Math.random() - 0.5) * 1.0
    }

    function updateClusterOrbit(p: Particle, target: { x: number; y: number }, clusterRadius: number) {
      // Gentle random drift — no net rotation
      p.angle += (Math.random() - 0.5) * 0.004
      const tx = target.x + Math.cos(p.angle) * clusterRadius
      const ty = target.y + Math.sin(p.angle) * clusterRadius
      p.x += (tx - p.x) * 0.03 + (Math.random() - 0.5) * 0.4
      p.y += (ty - p.y) * 0.03 + (Math.random() - 0.5) * 0.4
    }

    function checkClustersFormed(): boolean {
      const spheres = Array.from(spheresRef.current.values())
      if (spheres.length === 0) return false
      // Only check sphere-bound particles — ambient ones never settle
      const sphereBound = particles.filter((p) => !p.ambient)
      if (sphereBound.length === 0) return false
      let settled = 0
      for (const p of sphereBound) {
        const sphere = spheres[p.cluster % spheres.length]!
        const d = Math.sqrt((sphere.x - p.x) ** 2 + (sphere.y - p.y) ** 2)
        if (d < sphere.radius + 30) settled++
      }
      return settled > sphereBound.length * 0.5
    }

    function updateMatrixDropsForSphere(sphereId: string, sphere: SphereRegistration, glowLevel: number) {
      if (!sphere.showMatrix || sphere.state === 'idle' || sphere.state === 'complete') return
      let drops = matrixDrops.get(sphereId)
      if (!drops) {
        drops = []
        matrixDrops.set(sphereId, drops)
      }

      const clipR = sphere.radius - 4
      const spawnRate = sphere.state === 'speaking' ? 0.5 : 0.4

      if (Math.random() < spawnRate) {
        const xOffset = (Math.random() - 0.5) * clipR * 1.6
        drops.push({
          x: sphere.x + xOffset,
          y: sphere.y - clipR,
          speed: 0.4 + Math.random() * 0.6,
          char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!,
          life: 1
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

        ctx!.globalAlpha = Math.max(0, drop.life) * 0.55 * (glowLevel > 0.1 ? 1.6 : 1)
        ctx!.fillStyle = colors[0]!
        ctx!.font = '8px monospace'
        ctx!.textAlign = 'center'
        ctx!.fillText(drop.char, drop.x, drop.y)
      }
      ctx!.restore()
    }

    function animate() {
      time++
      ctx!.globalAlpha = 1
      ctx!.clearRect(0, 0, width, height)

      const spheres = Array.from(spheresRef.current.values())
      const rings = Array.from(ringsRef.current.values())

      // ambientRatio mode only: snap sphere-bound particles near their sphere on first frame
      // so they appear already-grouped with no visible drift animation (Vitakka only)
      if (ambientRatioRef.current > 0 && !particlesPositioned && spheres.length > 0) {
        particlesPositioned = true
        for (const p of particles) {
          if (!p.ambient) {
            const sphere = spheres[p.cluster % spheres.length]!
            const a = Math.random() * Math.PI * 2
            // Place on the orbital ring from frame 1 — matches wander orbit at 1.2× radius
            const r = sphere.radius * (1.1 + Math.random() * 0.2)
            p.x = sphere.x + Math.cos(a) * r
            p.y = sphere.y + Math.sin(a) * r
            p.angle = a
            p.vx = 0
            p.vy = 0
          }
        }
      }

      if (currentPhase === 'wander') {
        const shouldForce = forceSettleSignal.current && spheres.length > 0
        const shouldAutoForm = time > wanderDurationRef.current && spheres.length > 0
        if (shouldForce || shouldAutoForm) {
          currentPhase = 'forming'
          formingStart = time
          setPhase('forming')
          onPhaseChangeRef.current?.('forming')
          forceSettleSignal.current = false
        }
      }
      if (currentPhase === 'forming' && checkClustersFormed()) {
        currentPhase = 'settled'
        setPhase('settled')
        onPhaseChangeRef.current?.('settled')
      }

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

        const renderer = RING_RENDERERS[ring.style]
        if (renderer) {
          renderer({
            ctx: ctx!,
            centerX: ring.centerX,
            centerY: ring.centerY,
            radius: ring.radius,
            spherePositions: ring.spherePositions,
            sphereCount: ring.sphereCount,
            colors,
            time,
            completion: ringCompletion,
            envoyProgress: ringEnvoyProgress
          })
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!
        if (p.opacity < p.baseOpacity) p.opacity += 0.003

        if (p.ambient) {
          updateWander(p)
        } else if (spheres.length > 0) {
          const sphere = spheres[p.cluster % spheres.length]!
          if (currentPhase === 'wander') updateClusterOrbit(p, sphere, sphere.radius * 1.2)
          else if (currentPhase === 'forming') updateToCluster(p, sphere)
          else updateClusterOrbit(p, sphere, sphere.radius)
        }

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.opacity
        ctx!.fill()
      }

      // Direct messages — particles flying straight from sphere A center to sphere B center
      for (let i = directMessagesRef.current.length - 1; i >= 0; i--) {
        const msg = directMessagesRef.current[i]!
        msg.progress += 0.07 // ~14 frames = 0.23s — fast, clear, done before next fires

        const t = Math.min(msg.progress, 1)
        // Smooth ease
        const ease = t * t * (3 - 2 * t)

        const headX = msg.fromX + (msg.toX - msg.fromX) * ease
        const headY = msg.fromY + (msg.toY - msg.fromY) * ease

        // Fading trail — sample previous positions along the trajectory
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

        // Leading glow
        const dg = ctx!.createRadialGradient(headX, headY, 0, headX, headY, 14)
        dg.addColorStop(0, '#ffffff')
        dg.addColorStop(0.3, colors[0]!)
        dg.addColorStop(1, 'transparent')
        ctx!.globalAlpha = 0.9
        ctx!.fillStyle = dg
        ctx!.beginPath()
        ctx!.arc(headX, headY, 14, 0, Math.PI * 2)
        ctx!.fill()

        // Solid white core
        ctx!.globalAlpha = 1
        ctx!.fillStyle = '#ffffff'
        ctx!.beginPath()
        ctx!.arc(headX, headY, 3, 0, Math.PI * 2)
        ctx!.fill()

        // Arrival — trigger glow on destination sphere and remove
        if (msg.progress >= 1) {
          const toSphere = spheres.find((s) => s.id === msg.toSphereId)
          if (toSphere) clusterGlow.set(toSphere.id, 1)
          directMessagesRef.current.splice(i, 1)
        }
      }

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

      // Ring matrix — falling chars inside the ring circle when thinking, same as sphere matrix
      for (const ring of rings) {
        if (!ring.thinking) continue
        let chars = ringChars.get(ring.id)
        if (!chars) {
          chars = []
          ringChars.set(ring.id, chars)
        }

        const clipR = ring.radius

        // Spawn drops at top of ring interior
        if (Math.random() < 0.4) {
          const xOffset = (Math.random() - 0.5) * clipR * 1.8
          chars.push({
            x: ring.centerX + xOffset,
            y: ring.centerY - clipR,
            speed: 0.8 + Math.random() * 1.2,
            char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!,
            life: 1
          })
        }

        ctx!.save()
        ctx!.beginPath()
        ctx!.arc(ring.centerX, ring.centerY, clipR, 0, Math.PI * 2)
        ctx!.clip()
        ctx!.font = '9px monospace'
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

          ctx!.globalAlpha = Math.max(0, c.life) * 0.3
          ctx!.fillStyle = colors[0]!
          ctx!.fillText(c.char, c.x, c.y)
        }

        ctx!.restore()
      }

      ctx!.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }

    resize()
    createParticles()
    animate()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [particleCount])

  return (
    <AIAContext.Provider value={contextValue}>
      <div ref={containerRef} className={`relative w-full overflow-hidden ${className ?? ''}`}>
        <canvas ref={canvasRef} className='absolute inset-0 z-0 pointer-events-none' />
        <div className='relative z-[1]'>{children}</div>
      </div>
    </AIAContext.Provider>
  )
}
