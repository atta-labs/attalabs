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
  fireDirectedMessage: (fromSphereId: string, toSphereId: string) => void
  /** Trigger the gravitational fabric ramp. Call when the ring animation is complete. */
  startGravity: () => void
}

export const AIAContext = createContext<AIAContextValue | null>(null)

export function useAIAContext() {
  return useContext(AIAContext)
}
