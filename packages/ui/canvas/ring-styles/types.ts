export interface RingStyleContext {
  ctx: CanvasRenderingContext2D
  centerX: number
  centerY: number
  radius: number
  spherePositions: { x: number; y: number }[]
  sphereCount: number
  colors: string[]
  time: number
  completion: number
  envoyProgress: number
}

export type RingStyleRenderer = (context: RingStyleContext) => void
