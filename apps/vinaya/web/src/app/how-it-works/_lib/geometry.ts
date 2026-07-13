import type { GroupKey } from './groupings'

/**
 * Pure pixel geometry for the rings diagram — no model knowledge, no
 * doctrine, no node data. Every function here takes counts/keys and returns
 * coordinates; `DiagramModel` never appears in this file. Radius/angle/chord
 * math is entirely this layer's job (see `diagram-model.ts`'s own doc
 * comment: "What is NOT here: geometry").
 */

export type Point = { x: number; y: number }

export const VIEW_SIZE = 640
export const CENTER: Point = { x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 }
export const HUB_RADIUS = 56
export const BAND_WIDTH = 26
export const BAND_GAP = 8

export function polarPoint(radius: number, angleDeg: number, center: Point = CENTER): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: center.x + radius * Math.cos(rad), y: center.y + radius * Math.sin(rad) }
}

/** SVG path `d` for one annular sector between two radii and two angles. */
export function sectorPath(rIn: number, rOut: number, a0: number, a1: number, center: Point = CENTER): string {
  const p0 = polarPoint(rOut, a0, center)
  const p1 = polarPoint(rOut, a1, center)
  const p2 = polarPoint(rIn, a1, center)
  const p3 = polarPoint(rIn, a0, center)
  const large = a1 - a0 > 180 ? 1 : 0
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${p3.x} ${p3.y}`,
    'Z'
  ].join(' ')
}

export type BandGeometry = { key: GroupKey; rIn: number; rOut: number; rMid: number }

/**
 * Six concentric bands around the hub, innermost to outermost, following
 * `order` (a fixed structural order — six groups always exist; ring0's
 * prevent→ring2's audit progression mirrors doctrine's own model, the seam
 * and actor bands sit outside it). Only the *radius range* is fixed per
 * band — how many sectors a band splits into once drilled is always
 * `children.length`, never hardcoded here.
 */
export function overviewBands(order: GroupKey[]): BandGeometry[] {
  return order.map((key, i) => {
    const rIn = HUB_RADIUS + BAND_GAP + i * (BAND_WIDTH + BAND_GAP)
    const rOut = rIn + BAND_WIDTH
    return { key, rIn, rOut, rMid: (rIn + rOut) / 2 }
  })
}

const DRILL_R_IN = 128
const DRILL_R_OUT = 280

export type ChildArc = { id: string; d: string; midAngle: number; midRadius: number }

/** Splits a drilled group's children into N equal sectors. `n` is always
 * `children.length` at the call site — never a fixed count. */
export function drillArcs(childIds: string[]): ChildArc[] {
  const n = childIds.length
  if (n === 0) return []
  const gapDeg = n > 1 ? 2.4 : 0
  const span = 360 / n
  return childIds.map((id, i) => {
    const a0 = i * span + gapDeg / 2
    const a1 = (i + 1) * span - gapDeg / 2
    return {
      id,
      d: sectorPath(DRILL_R_IN, DRILL_R_OUT, a0, a1),
      midAngle: (a0 + a1) / 2,
      midRadius: (DRILL_R_IN + DRILL_R_OUT) / 2
    }
  })
}

/** A gentle curve (not a straight chord) between two drilled-ring points,
 * bowed toward the hub so it reads as a connector, not a diameter cut. */
export function chordPath(a: Point, b: Point): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const towardCenter = 0.35
  const cx = mx + (CENTER.x - mx) * towardCenter
  const cy = my + (CENTER.y - my) * towardCenter
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}
