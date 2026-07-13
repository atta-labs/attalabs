export interface Point {
  x: number
  y: number
}

/**
 * The point on a circle's edge closest to `origin`, facing it — every projectile's
 * target is derived from this, never a hardcoded offset (that's the bug the SVG pass had).
 */
export function edgePointOnCircle(origin: Point, center: Point, radius: number): Point {
  const dx = origin.x - center.x
  const dy = origin.y - center.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  return {
    x: center.x + (dx / dist) * radius,
    y: center.y + (dy / dist) * radius
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

/**
 * Same endpoints as `lerpPoint` (offset is exactly 0 at t=0 and t=1, so origin/target
 * never move), but bulges perpendicular to the straight line in between, peaking at the
 * midpoint — a thrown/fired projectile arcing slightly instead of flying dead straight.
 */
export function curvedLerpPoint(a: Point, b: Point, t: number, bulge: number): Point {
  const base = lerpPoint(a, b, t)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const offset = bulge * Math.sin(t * Math.PI)
  return { x: base.x + nx * offset, y: base.y + ny * offset }
}

export function angleOf(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Fade in at launch, hold, fade out just before impact so the flight loop doesn't pop. */
export function projectileAlpha(progress: number): number {
  if (progress < 0.08) return progress / 0.08
  if (progress > 0.82) return clamp01(1 - (progress - 0.82) / 0.08)
  return 1
}

/**
 * Impact-spark envelope: silent until the tail of the cycle, quick rise, then a slow
 * eased-out fade — a real shockwave lingers, it doesn't snap off. Window is deliberately
 * wide (last ~38% of the flight) so the wave reads as a real event, not a single frame.
 */
export function impactEnvelope(progress: number): number {
  const start = 0.62
  if (progress < start) return 0
  const local = (progress - start) / (1 - start)
  if (local < 0.12) return local / 0.12
  const fadeT = clamp01((local - 0.12) / 0.88)
  return clamp01(1 - fadeT * fadeT)
}

/** Launch-bay hatch: snaps open right as the projectile leaves, closes once it's clear. */
export function hatchEnvelope(progress: number): number {
  if (progress < 0.05) return progress / 0.05
  if (progress < 0.2) return 1
  if (progress < 0.32) return clamp01(1 - (progress - 0.2) / 0.12)
  return 0
}

/**
 * A projectile's label only fades in once it's clearly separated from the figure that
 * threw it (roughly a beat into the flight) — reading the label and the launch at the
 * same instant is what made the busier scenes illegible. `flightT` is progress WITHIN
 * the ballistic phase (0 at release, 1 at impact), not the whole cycle.
 */
export function labelRevealAlpha(flightT: number): number {
  const revealAt = 0.32
  if (flightT < revealAt) return 0
  return clamp01((flightT - revealAt) / 0.15)
}
