'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AIAContext,
  type AIAContextValue,
  type CanvasPhase,
  type RingRegistration,
  type SphereRegistration
} from '../aia-context'
import { BG_RENDERERS, type BgEvent, type BgRenderer, type BgVariant } from '../bg'
import { getThemeColors, resolveColor } from '../shared/colors'
import { refreshThemeCache } from '../shared/theme'
import { paintClusterGlow } from '../shared/paint'
import { renderBgFills } from './bg-fills'
import { renderMessages } from './message-system'
import { renderRingMatrix, renderSphereMatrix } from './matrix-rain'
import { createParticles, renderParticles } from './particle-system'
import { createPhaseState, tickPhaseMachine } from './phase-machine'
import { createRingEnvoyState, tickRingEnvoy } from './ring-envoy'
import type { DirectMessage, MatrixDrop, Particle, RingChar } from './types'

// Re-export so index.tsx imports these from one place
export { AIAContext }
export type { AIAContextValue }

export interface AIACanvasRef {
  forceSettle: () => void
}

export interface AIACanvasConfig {
  bg?: BgVariant | BgRenderer
  onPhaseChange?: (phase: CanvasPhase) => void
  onSphereAbsorb?: (sphereId: string) => void
  onOriginComplete?: () => void
  wanderDuration?: number
  alwaysRenderSpheres?: boolean
  matchContentHeight?: boolean
  autoTriggerGravity?: boolean
  paused?: boolean
}

export interface AIACanvasRefs {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  contextValue: AIAContextValue
}

export function useAIACanvas(
  {
    bg,
    onPhaseChange,
    onSphereAbsorb,
    onOriginComplete,
    wanderDuration = 120,
    alwaysRenderSpheres = false,
    matchContentHeight = false,
    autoTriggerGravity = true,
    paused = false
  }: AIACanvasConfig,
  ref: React.Ref<AIACanvasRef> | undefined
): AIACanvasRefs {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const matchContentHeightRef = useRef(matchContentHeight)
  matchContentHeightRef.current = matchContentHeight
  const onPhaseChangeRef = useRef<((phase: CanvasPhase) => void) | undefined>(onPhaseChange)
  onPhaseChangeRef.current = onPhaseChange
  const onSphereAbsorbRef = useRef<((sphereId: string) => void) | undefined>(onSphereAbsorb)
  onSphereAbsorbRef.current = onSphereAbsorb
  const onOriginCompleteRef = useRef<(() => void) | undefined>(onOriginComplete)
  onOriginCompleteRef.current = onOriginComplete

  const spheresRef = useRef<Map<string, SphereRegistration>>(new Map())
  const ringsRef = useRef<Map<string, RingRegistration>>(new Map())
  const [phase, setPhase] = useState<CanvasPhase>('wander')

  const directMessagesRef = useRef<DirectMessage[]>([])
  const forceSettleSignal = useRef(false)
  const wanderDurationRef = useRef(wanderDuration)
  wanderDurationRef.current = wanderDuration
  const alwaysRenderSpheresRef = useRef(alwaysRenderSpheres)
  alwaysRenderSpheresRef.current = alwaysRenderSpheres
  const bgRef = useRef<BgVariant | BgRenderer | undefined>(bg)
  bgRef.current = bg
  const recentEventsRef = useRef<BgEvent[]>([])
  const startGravitySignalRef = useRef(false)
  const autoTriggerGravityRef = useRef(autoTriggerGravity)
  autoTriggerGravityRef.current = autoTriggerGravity
  const animIdRef = useRef<number | null>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const animateFnRef = useRef<(() => void) | null>(null)

  // ── Context callbacks ────────────────────────────────────────────────────

  const startGravity = useCallback(() => {
    startGravitySignalRef.current = true
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
    const from = spheres.find((s) => s.id.toLowerCase() === fromId.toLowerCase())
    const to = spheres.find((s) => s.id.toLowerCase() === toId.toLowerCase())
    if (!from || !to) return
    directMessagesRef.current.push({
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
      toSphereId: toId
    })
    recentEventsRef.current.push({ type: 'message-fired', fromId, toId })
  }, [])

  const fireSphereOrigin = useCallback((sphereId: string) => {
    recentEventsRef.current.push({ type: 'sphere-origin', sphereId })
  }, [])

  // ── Imperative handle ────────────────────────────────────────────────────

  useImperativeHandle(
    ref,
    () => ({
      forceSettle: () => {
        forceSettleSignal.current = true
      }
    }),
    []
  )

  // ── Animation loop ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Bind narrowed non-null types — TypeScript can't narrow through closure boundaries,
    // but it DOES infer the narrowed type at the point of a const assignment.
    const cvs: HTMLCanvasElement = canvas
    const gfx: CanvasRenderingContext2D = ctx

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let particleSphereIds: string[] = []
    const colors = getThemeColors()
    const dpr = window.devicePixelRatio || 1
    let time = 0
    let ringBgFade = 0

    const phaseState = createPhaseState()
    const envoyState = createRingEnvoyState()
    const matrixDrops = new Map<string, MatrixDrop[]>()
    const clusterGlow = new Map<string, number>()
    const ringChars = new Map<string, RingChar[]>()

    function resize() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      width = rect.width
      height = matchContentHeightRef.current ? Math.max(rect.height, containerRef.current.scrollHeight) : rect.height
      cvs.width = width * dpr
      cvs.height = height * dpr
      cvs.style.width = `${width}px`
      cvs.style.height = `${height}px`
      gfx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function animate() {
      if (pausedRef.current) {
        animIdRef.current = null
        return
      }
      time++
      gfx.globalAlpha = 1
      gfx.clearRect(0, 0, width, height)

      // Theme cache refresh — one getComputedStyle check per frame, read by
      // every downstream renderer (fabric.ts, message-system.ts, paint primitives).
      refreshThemeCache()

      // Auto-resize when content height changes
      if (containerRef.current) {
        const newH = Math.max(containerRef.current.getBoundingClientRect().height, containerRef.current.scrollHeight)
        if (Math.abs(newH - height) > 10) resize()
      }

      const spheres = Array.from(spheresRef.current.values())
      const rings = Array.from(ringsRef.current.values())
      const frameEvents = recentEventsRef.current.slice()
      recentEventsRef.current = []

      // ── Background renderer ──────────────────────────────────────────────
      const bgProp = bgRef.current
      const bgRenderer: BgRenderer | null | undefined =
        typeof bgProp === 'function' ? bgProp : bgProp ? BG_RENDERERS[bgProp] : null
      bgRenderer?.({
        ctx: gfx,
        t: time,
        W: width,
        H: height,
        phase: phaseState.currentPhase,
        settleProgress: phaseState.settleProgress,
        rings,
        spheres,
        recentEvents: frameEvents,
        onSphereAbsorb: onSphereAbsorbRef.current,
        onOriginComplete: onOriginCompleteRef.current
      })

      // ── Phase machine ────────────────────────────────────────────────────
      const { forceSettleConsumed, gravitySignalConsumed } = tickPhaseMachine(
        phaseState,
        time,
        spheres.length,
        forceSettleSignal.current,
        wanderDurationRef.current,
        autoTriggerGravityRef.current,
        startGravitySignalRef.current,
        (p) => {
          setPhase(p)
          onPhaseChangeRef.current?.(p)
        }
      )
      if (forceSettleConsumed) forceSettleSignal.current = false
      if (gravitySignalConsumed) startGravitySignalRef.current = false
      const currentPhase = phaseState.currentPhase

      // ── Ring envoy ───────────────────────────────────────────────────────
      tickRingEnvoy(envoyState, rings, currentPhase)

      // ── Particle system ──────────────────────────────────────────────────
      if (spheres.length > 0) {
        const currentIds = spheres.map((s) => s.id)
        const idsChanged =
          currentIds.length !== particleSphereIds.length || currentIds.some((id, i) => id !== particleSphereIds[i])
        if (idsChanged) {
          const result = createParticles(spheres)
          particles = result.particles
          particleSphereIds = result.ids
        }
      }
      renderParticles(gfx, particles, spheres)

      // ── Directed messages ────────────────────────────────────────────────
      renderMessages(gfx, directMessagesRef.current, colors, spheres, clusterGlow)

      // ── Background fills (ring interior, then sphere interiors) ──────────
      // Resolve bgColor every frame so live theme/scheme swaps take effect and
      // we pick up --background even if it lands after canvas mount.
      if (currentPhase !== 'wander' || alwaysRenderSpheresRef.current) {
        const bgColor = resolveColor('var(--background)', 'transparent')
        ringBgFade = renderBgFills(gfx, rings, spheres, bgColor, envoyState.ringCompletion, ringBgFade)
      }

      // ── Sphere glow + matrix rain ────────────────────────────────────────
      if (currentPhase !== 'wander' || alwaysRenderSpheresRef.current) {
        for (const sphere of spheres) {
          const glow = clusterGlow.get(sphere.id) ?? 0
          if (glow > 0.01) {
            paintClusterGlow(gfx, sphere.x, sphere.y, sphere.radius + 15, sphere.color, glow)
            clusterGlow.set(sphere.id, glow * 0.96)
          }
          renderSphereMatrix(gfx, sphere, matrixDrops)
        }
      }

      // ── Ring matrix rain ─────────────────────────────────────────────────
      for (const ring of rings) {
        renderRingMatrix(gfx, ring, spheres, colors, ringChars)
      }

      gfx.globalAlpha = 1
      animIdRef.current = requestAnimationFrame(animate)
    }

    resize()
    animateFnRef.current = animate
    if (!pausedRef.current) animate()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current)
      animateFnRef.current = null
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (paused) {
      if (animIdRef.current !== null) {
        cancelAnimationFrame(animIdRef.current)
        animIdRef.current = null
      }
      return
    }
    if (animateFnRef.current && animIdRef.current === null) {
      animateFnRef.current()
    }
  }, [paused])

  // ── Context value ────────────────────────────────────────────────────────

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
    startGravity,
    fireSphereOrigin
  }

  return { containerRef, canvasRef, contextValue }
}
