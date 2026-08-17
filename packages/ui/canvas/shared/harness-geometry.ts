// Shared polar helpers for the harness ring (ring band + conduits + gripper columns).
// Pure geometry — screen coords, y-down. Angles in degrees, 0° = east, clockwise.
// Ported from apps/vinaya-portal/web's SVG HarnessStructure (harness-geometry.ts) — same math,
// consumed here by the canvas-drawn HarnessRing so both stay geometrically identical.

// Ring segments + columns sit on the DIAGONALS, so the top/bottom of the ring stays
// clear for surrounding content. Electricity gaps land on the axes.
export const RING_AXIS_DEG = [45, 135, 225, 315] // arc centers = column positions
export const CONDUIT_ANGLES_DEG = [0, 90, 180, 270] // gap centers (N/E/S/W) — electricity

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

export function arcLength(r: number, startDeg: number, endDeg: number): number {
  return round((Math.abs(endDeg - startDeg) * Math.PI * r) / 180)
}
