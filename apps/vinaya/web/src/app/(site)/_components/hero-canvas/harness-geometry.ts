// Shared polar helpers for the harness overlay (ring + conduits + clamps). Pure
// geometry — screen coords, y-down. Angles in degrees, 0° = east, clockwise.

// Ring segments + columns sit on the DIAGONALS, so the top/bottom of the ring stays
// clear for the platform's title and CTA. Electricity gaps land on the axes.
export const RING_AXIS_DEG = [45, 135, 225, 315] // arc centers = column positions
export const CONDUIT_ANGLES_DEG = [0, 90, 180, 270] // gap centers (N/E/S/W) — electricity

// Round to 3dp so trig output stringifies identically on server and client —
// full-precision floats format differently across the SSR/hydration boundary
// and trip React's hydration-mismatch check.
export function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) }
}

// Shift a point perpendicular to ray `deg` by `s` (for beam/strip half-widths).
export function offsetPoint(base: { x: number; y: number }, deg: number, s: number) {
  const rad = (deg * Math.PI) / 180
  return { x: round(base.x - s * Math.sin(rad)), y: round(base.y + s * Math.cos(rad)) }
}

// SVG arc `d` from startDeg to endDeg (clockwise) at radius r.
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${round(r)} ${round(r)} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

// Approx arc length — enough for stroke-dash reveal math.
export function arcLength(r: number, startDeg: number, endDeg: number): number {
  return round((Math.abs(endDeg - startDeg) * Math.PI * r) / 180)
}
