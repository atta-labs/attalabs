// packages/ui/canvas/bg/types.ts
import type { CanvasPhase, RingRegistration, SphereRegistration } from '../aia-context'

export interface BgState {
  ctx: CanvasRenderingContext2D
  t: number // monotonic frame counter
  W: number // canvas logical width (pre-DPR)
  H: number // canvas logical height (pre-DPR)
  phase: CanvasPhase // 'wander' | 'forming' | 'settled'
  settleProgress: number // 0→1 smooth — the bridge to bg renderers
  rings: RingRegistration[] // registered rings this frame
  spheres: SphereRegistration[] // registered spheres this frame
  recentEvents: BgEvent[] // events that fired this frame, cleared next frame
  // Optional pointer in canvas-local coords — when active, the ACTUAL fabric grid lines
  // within a radius brighten (lighten) as the cursor passes. Renderers that don't receive
  // it behave exactly as before.
  pointer?: { x: number; y: number; active: boolean }
  // Optional emitter points in canvas-local coords — the fabric's cursor-directed grid
  // agents (config.gridAgents) are BORN at these points (e.g. the harness's electricity
  // arcs) rather than a generic ring edge.
  emitters?: { x: number; y: number }[]
  onSphereAbsorb?: (sphereId: string) => void // fired when a Tron particle joins a sphere
  onOriginComplete?: () => void // fired once when all origin particles have arrived
}

export type BgEvent =
  | { type: 'message-fired'; fromId: string; toId: string }
  | { type: 'sphere-state-changed'; sphereId: string }
  | { type: 'ring-closed'; cx: number; cy: number }
  | { type: 'sphere-origin'; sphereId: string; count?: number; color?: string; speedMultiplier?: number }
  | { type: 'sphere-gather'; sphereId: string; count: number; color?: string }

export type BgRenderer = (state: BgState) => void

export type BgVariant = 'fabric' | 'none'
