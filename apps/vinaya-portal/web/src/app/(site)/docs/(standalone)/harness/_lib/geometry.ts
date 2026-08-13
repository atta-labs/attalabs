import { arc as d3Arc, pie as d3Pie } from 'd3-shape'
import type { GroupKey } from './groupings'

/**
 * Pure pixel geometry for the rings diagram — no model knowledge, no
 * doctrine, no node data. Every function here takes counts/keys and returns
 * coordinates; `DiagramModel` never appears in this file. Radius/angle/chord
 * math is entirely this layer's job (see `diagram-model.ts`'s own doc
 * comment: "What is NOT here: geometry").
 *
 * Band *thickness* is role-based, not uniform: there are exactly two SEAM
 * rings in Issue #508's design (`contracts`, `actions` — hand-offs, not
 * mechanisms; distinguished by fill color, a `background`-token punch-
 * through rather than a hue). Every other band — the three enforcement
 * rings, `actors`, and the `substrate` (GitHub itself, the ground every
 * enforced action lands on) — is a real governed object. Rendering
 * `substrate` thin was a classification bug, not a deliberate choice:
 * GitHub isn't a hand-off, it's substrate. `actors`/`ring0` (Hooks) are
 * widened past the other thick bands on explicit request — the two
 * outermost rings read as the diagram's most prominent objects — and the
 * seam bands stay their own, narrower width; seam vs. mechanism is "thin
 * vs. thick" again, plus the fill-color contrast.
 *
 * Sector/annulus path generation goes through `d3-shape`'s `arc()`/`pie()`
 * — battle-tested SVG-path generators — instead of hand-rolled trig
 * (D3 is a rendering library only: it computes paths from radii/angles this
 * file still owns, it never touches `DiagramModel`). `d3.arc()`/`d3.pie()`
 * generators are origin-centered by convention; callers wrap the resulting
 * `<path>` elements in one `<g transform="translate(cx,cy)">` rather than
 * baking the offset into every path string — the idiomatic d3 pattern.
 * Labels are plain horizontal text at each shape's `d3.arc().centroid()` —
 * no `<textPath>`, no curvature, no per-label width measurement. `centroid`
 * is `d3-shape`'s own primitive for "the middle point of this arc," so
 * label placement goes through d3 too, not hand-rolled trig.
 */

export type Point = { x: number; y: number }

// Outer radius of the overview diagram = HUB_RADIUS + 2*OUTER_THICK_BAND
// (actors, ring0) + 3*THICK_BAND (ring1, ring2, substrate) + 2*SEAM_BAND
// (contracts, actions) + 7*BAND_GAP = 130+200+216+140+21 = 707. VIEW_SIZE
// must clear that with margin or the outermost (`actors`) ring and its
// label get clipped by the viewBox edge — this bit the page once already
// when HUB_RADIUS/SEAM_BAND grew without VIEW_SIZE following.
export const VIEW_SIZE = 1540
export const CENTER: Point = { x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 }
export const HUB_RADIUS = 130

const THICK_BAND = 72
// `actors` and `ring0` (Hooks) widened past the other thick bands on
// explicit request — the outermost two rings read as the diagram's most
// prominent objects, wider than ring1/ring2/substrate.
const OUTER_THICK_BAND = 100
// Shrunk back down (explicit ask) from a since-reverted 104 — still wider
// than the original 52 so the two seam rings (contracts, actions) read as a
// real band, not a hairline, but no longer competing with the enforcement
// rings for width.
const SEAM_BAND = 70
const BAND_GAP = 3

/** The only two SEAM rings in the design (Issue #508) — hand-offs, not
 * mechanisms. Every other band, `substrate` included, is thick. */
function isSeamBand(key: GroupKey | 'substrate'): boolean {
  return key === 'contracts' || key === 'actions'
}

/** `actors` and `ring0` (Hooks) — the two outermost rings, widened past the
 * rest of the thick bands (explicit ask). */
function isOuterThickBand(key: GroupKey | 'substrate'): boolean {
  return key === 'actors' || key === 'ring0'
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Rounded to 2 decimal places — trig output otherwise carries enough
 * floating-point noise in its low digits to differ between the server's
 * SSR pass and the client's hydration pass (same math, different V8
 * build/JIT state), which React reports as a hydration mismatch. */
function round(n: number): number {
  return Math.round(n * 100) / 100
}

/** `angleDeg`: 0 = top (12 o'clock), clockwise-positive — matches d3's own
 * arc-angle convention exactly, so degree math here and radian math in the
 * d3 generators below never disagree. */
export function polarPoint(radius: number, angleDeg: number, center: Point = CENTER): Point {
  const rad = degToRad(angleDeg) - Math.PI / 2
  return { x: round(center.x + radius * Math.cos(rad)), y: round(center.y + radius * Math.sin(rad)) }
}

/**
 * SVG path `d` for one annular sector, via `d3.arc()` — origin-centered
 * (0,0); the caller renders it inside a `<g transform="translate(cx,cy)">`.
 * `a0`/`a1` in degrees (0 = top, clockwise), converted to d3's radians.
 */
export function sectorPath(rIn: number, rOut: number, a0: number, a1: number): string {
  return d3Arc()({ innerRadius: rIn, outerRadius: rOut, startAngle: degToRad(a0), endAngle: degToRad(a1) }) ?? ''
}

export type BandGeometry = { key: GroupKey | 'substrate'; rIn: number; rOut: number; rMid: number; thick: boolean }

/**
 * Bands from the outermost group inward, following `order` (`GROUP_ORDER`
 * from `groupings.ts` — six groups always exist). A seventh, static
 * "substrate" band (the GitHub boundary — no `DiagramNode`, non-interactive
 * framing, same status as the old page's static hub) is inserted right
 * after `actions`: the crossing lands you inside GitHub, where ring1/ring2
 * both run. Only each band's *radius range* is fixed here — how many
 * sectors a real band splits into once drilled is always
 * `children.length`, never hardcoded.
 */
export function overviewBands(order: GroupKey[]): BandGeometry[] {
  const withSubstrate: Array<GroupKey | 'substrate'> = []
  for (const key of order) {
    withSubstrate.push(key)
    if (key === 'actions') withSubstrate.push('substrate')
  }

  // `order` is outermost-first (actors ... ring2), but radii must grow
  // outward from the hub — so walk the reversed (innermost-first) list to
  // assign radii, then reverse the result back to the caller's order.
  let rIn = HUB_RADIUS
  const innerFirst = [...withSubstrate].reverse().map((key) => {
    const thick = !isSeamBand(key)
    const width = isOuterThickBand(key) ? OUTER_THICK_BAND : thick ? THICK_BAND : SEAM_BAND
    rIn += BAND_GAP
    const rOut = rIn + width
    const band: BandGeometry = { key, rIn, rOut, rMid: (rIn + rOut) / 2, thick }
    rIn = rOut
    return band
  })
  return innerFirst.reverse()
}

/** Full-circle band path (an annulus, not a wedge) for the overview ring at
 * `[rIn, rOut]` — every overview band spans the whole 360°; only its
 * *drilled* children split into wedges. Also `d3.arc()`, origin-centered. */
export function bandRingPath(rIn: number, rOut: number): string {
  return sectorPath(rIn, rOut, 0, 360)
}

/**
 * The point a band's label sits at — `d3.arc().centroid()` on a zero-span
 * arc `[rIn, rOut]` pinned to angle 0 (top). `centroid()` only needs the
 * *average* of `startAngle`/`endAngle` (both 0 here) and of
 * `innerRadius`/`outerRadius`, so a zero-span datum is a legitimate input,
 * not a hack — it's how you ask d3 for "the middle of this ring at the top"
 * rather than the middle of an actual wedge. Origin-centered like every
 * other d3 output here; caller adds `CENTER` (or renders inside the same
 * translated `<g>` the band paths use).
 */
export function bandCentroid(rIn: number, rOut: number): Point {
  const [x, y] = d3Arc().centroid({ innerRadius: rIn, outerRadius: rOut, startAngle: 0, endAngle: 0 })
  return { x, y }
}

// Uses nearly the full viewBox (VIEW_SIZE / 2 = 770) — the drilled ring is
// the page's dominant element and must read as big, not a small disc
// floating in a lot of unused canvas.
const DRILL_R_IN = 400
const DRILL_R_OUT = 730
const DRILL_PAD_DEG = 1.5

export type ChildArc = { id: string; d: string; centroid: Point }

/**
 * Splits a drilled group's children into N equal sectors via `d3.pie()`
 * (`.value(() => 1)` — equal weight, `.sort(null)` — preserves the model's
 * own array order rather than d3's default by-value sort). `n` is always
 * `children.length` at the call site — never a fixed count. Each wedge's
 * label point is that same wedge's own `d3.arc().centroid()` — the actual
 * sector's midpoint, not a hand-computed angle/radius pair.
 */
export function drillArcs(childIds: string[]): ChildArc[] {
  if (childIds.length === 0) return []
  const pieGen = d3Pie<string>()
    .value(() => 1)
    .sort(null)
    .padAngle(degToRad(DRILL_PAD_DEG))
  const slices = pieGen(childIds)
  const arcGen = d3Arc()
  return slices.map((slice) => {
    const datum = {
      innerRadius: DRILL_R_IN,
      outerRadius: DRILL_R_OUT,
      startAngle: slice.startAngle,
      endAngle: slice.endAngle,
      padAngle: slice.padAngle
    }
    const [cx, cy] = arcGen.centroid(datum)
    return { id: slice.data, d: arcGen(datum) ?? '', centroid: { x: cx, y: cy } }
  })
}
