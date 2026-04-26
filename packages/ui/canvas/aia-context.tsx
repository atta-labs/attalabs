'use client'

import { type RefObject, createContext, useContext } from 'react'

export type SphereState = 'idle' | 'speaking' | 'complete'
export type CanvasPhase = 'wander' | 'forming' | 'settled'
export type RingStyle = 'wave' | 'particles' | 'line' | 'none'

export interface SphereRegistration {
  id: string
  x: number
  y: number
  radius: number
  color: string
  state: SphereState
  particleCount: number
  showMatrix: boolean
  matrixColors?: string[]
  matrixOpacity?: number
  solidBg?: boolean
  bgOpacity?: number
  visible?: boolean
}

export interface RingRegistration {
  id: string
  centerX: number
  centerY: number
  radius: number
  style: RingStyle
  spherePositions: { x: number; y: number }[]
  sphereCount: number
  thinking: boolean
  matrixOpacity?: number
  bgOpacity?: number
}

export interface AIAContextValue {
  registerSphere: (reg: SphereRegistration) => void
  updateSphere: (id: string, updates: Partial<SphereRegistration>) => void
  unregisterSphere: (id: string) => void
  registerRing: (reg: RingRegistration) => void
  updateRing: (id: string, updates: Partial<RingRegistration>) => void
  unregisterRing: (id: string) => void
  phase: CanvasPhase
  containerRef: RefObject<HTMLDivElement | null>
  /** 'vertical-first': waypoint = (from.x, to.y) — travels vertically then horizontally.
   *  'horizontal-first': waypoint = (to.x, from.y) — travels horizontally then vertically. */
  fireDirectedMessage: (
    fromSphereId: string,
    toSphereId: string,
    speed?: number,
    waypointStyle?: 'vertical-first' | 'horizontal-first'
  ) => void
  /** Trigger the gravitational fabric ramp. Call when the ring animation is complete. */
  startGravity: () => void
  /** Trigger the origin birth animation — intense Tron births converge on this sphere.
   *  @param count  Number of births to spawn (default 5)
   *  @param color  Override particle color (default = sphere's registered color)
   *  @param speedMultiplier  Speed multiplier for particles (default 1.0) */
  fireSphereOrigin: (sphereId: string, count?: number, color?: string, speedMultiplier?: number) => void
  /** Spawn count Tron particles that travel along fabric grid lines and then orbit
   *  at the sphere perimeter — they never get absorbed.
   *  @param color  Override particle color (default = sphere's registered color) */
  fireSphereGather: (sphereId: string, count: number, color?: string) => void
}

export const AIAContext = createContext<AIAContextValue | null>(null)

export function useAIAContext() {
  return useContext(AIAContext)
}
