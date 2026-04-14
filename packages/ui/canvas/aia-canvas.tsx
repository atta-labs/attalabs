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
  // Resolve a CSS custom property value to a canvas-safe color string.
  // Tailwind v4 stores oklch values as raw components without the function wrapper,
  // e.g. --primary = "1 0 none" rather than "oklch(1 0 none)".
  // Canvas cannot parse CSS variable references or raw components — wrap if needed.
  const resolve = (raw: string, fallback: string): string => {
    if (!raw) return fallback
    if (raw.includes('(')) return raw // Already a full CSS color function
    return `oklch(${raw})` // Raw Tailwind v4 components — wrap in oklch()
  }

  if (typeof document === 'undefined') return ['#ffffff', 'rgba(156,163,175,0.8)', '#ffffff']

  const style = getComputedStyle(document.documentElement)
  return [
    resolve(style.getPropertyValue('--primary').trim(), '#ffffff'),
    resolve(style.getPropertyValue('--muted-foreground').trim(), 'rgba(156,163,175,0.8)'),
    resolve(style.getPropertyValue('--foreground').trim(), '#ffffff')
  ]
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
  color: string
}

export interface AIACanvasRef {
  forceSettle: () => void
}

interface AIACanvasProps {
  children: ReactNode
  particleCount?: number
  className?: string
  onPhaseChange?: (phase: CanvasPhase) => void
  wanderDuration?: number
  alwaysRenderSpheres?: boolean
  ambientRatio?: number
  matchContentHeight?: boolean
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
  matchContentHeight = false,
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
    let particlesPositioned = false

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
      const delay = (p.angle / (Math.PI * 2)) * 90
      if (time - formingStart < delay) return
      const lerpFactor = 0.005 + (p.radius / 2.5) * 0.025
      p.x += (target.x - p.x) * lerpFactor + (Math.random() - 0.5) * 1.0
      p.y += (target.y - p.y) * lerpFactor + (Math.random() - 0.5) * 1.0
    }

    // Direct positioning — particles are AT the sphere every frame.
    // No lerp, no drift, no searching. Sphere moves → particles move instantly.
    function updateClusterOrbit(p: Particle, target: { x: number; y: number }, clusterRadius: number) {
      p.angle += (Math.random() - 0.5) * 0.003
      p.x = target.x + Math.cos(p.angle) * clusterRadius + (Math.random() - 0.5) * 0.3
      p.y = target.y + Math.sin(p.angle) * clusterRadius + (Math.random() - 0.5) * 0.3
    }

    function checkClustersFormed(): boolean {
      const spheres = Array.from(spheresRef.current.values())
      if (spheres.length === 0) return false
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
        // Always use sphere's own color for matrix — agent-specific colors
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

      if (containerRef.current) {
        // Auto-resize when content height changes (rounds expand/collapse)
        const newHeight = Math.max(
          containerRef.current.getBoundingClientRect().height,
          containerRef.current.scrollHeight
        )
        if (Math.abs(newHeight - height) > 10) {
          resize()
        }
      }

      const spheres = Array.from(spheresRef.current.values())
      const rings = Array.from(ringsRef.current.values())

      if (ambientRatioRef.current > 0 && !particlesPositioned && spheres.length > 0) {
        // Snap sphere-bound particles near their sphere on first frame
        particlesPositioned = true
        if (spheres.length > 1) {
          let sbIdx = 0
          for (const p of particles) {
            if (!p.ambient) p.cluster = sbIdx++ % spheres.length
          }
        }
        for (const p of particles) {
          if (!p.ambient) {
            const sphere = spheres[p.cluster % spheres.length]!
            const a = Math.random() * Math.PI * 2
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
          if (spheres.length > 1) {
            let sbIdx = 0
            for (const p of particles) {
              if (!p.ambient) p.cluster = sbIdx++ % spheres.length
            }
          }
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

      if (spheres.length > 0 && currentPhase !== 'wander') {
        // Redistribute particles when sphere count changes (expand/collapse)
        const sphereBound = particles.filter((p) => !p.ambient)
        if (sphereBound.length > 0) {
          const needsRedistribute = sphereBound.some((p) => p.cluster >= spheres.length)
          const maxCluster = Math.max(...sphereBound.map((p) => p.cluster))
          const hasNewSpheres = spheres.length > maxCluster + 1

          if (needsRedistribute || hasNewSpheres) {
            let sbIdx = 0
            for (const p of particles) {
              if (!p.ambient) {
                p.cluster = sbIdx++ % spheres.length
                // Snap to sphere position immediately
                const sphere = spheres[p.cluster]!
                const a = Math.random() * Math.PI * 2
                const r = sphere.radius * (0.8 + Math.random() * 0.4)
                p.x = sphere.x + Math.cos(a) * r
                p.y = sphere.y + Math.sin(a) * r
                p.angle = a
              }
            }
          }
        }
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
          if (currentPhase === 'wander') updateClusterOrbit(p, sphere, sphere.radius)
          else if (currentPhase === 'forming') updateToCluster(p, sphere)
          else updateClusterOrbit(p, sphere, sphere.radius)
        }

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.opacity
        ctx!.fill()
      }

      // Direct messages
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

      // Ring matrix
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
      <div ref={containerRef} className={`relative w-full ${className ?? ''}`}>
        <canvas ref={canvasRef} className='absolute inset-0 z-0 pointer-events-none overflow-hidden' />
        <div className='relative z-[1]'>{children}</div>
      </div>
    </AIAContext.Provider>
  )
}
