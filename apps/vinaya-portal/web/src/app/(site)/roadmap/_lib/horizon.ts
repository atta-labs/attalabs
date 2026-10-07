// The roadmap's shared horizon: the fabric is a perspective floor receding to a vanishing
// point near the top of the viewport, and the drifting squares read the same depth so they
// sit on that floor instead of floating in front of it. Pure and cosmetic only.

// Where the horizon sits, as a fraction of the viewport height (hero camera ~17 degrees).
export const HORIZON_Y = 0.2

// How far below the horizon (fraction of the floor's screen height) the distance fog lasts.
export const FOG_LENGTH = 0.35

// 0 at the horizon, rising smoothly to 1 after `FOG_LENGTH` of the way down. `u` is that
// fraction: (screenY - horizonPx) / (viewportHeight - horizonPx).
export function horizonDepth(u: number): number {
  const t = Math.min(1, Math.max(0, u / FOG_LENGTH))
  return t * t * (3 - 2 * t)
}

// The haze below the horizon: the fabric's visible fraction is smoothstep(t)^1.8, t = 0 at the
// horizon and 1 FOG_BAND of the viewport height below it, so it is exactly 0 AT the horizon and
// rises slowly (the grid emerges from nothing, with no first line). Above the horizon it is 0.
export const FOG_BAND = 0.3

export function hazeVisible(y: number, h: number): number {
  const hy = h * HORIZON_Y
  const t = Math.min(1, Math.max(0, (y - hy) / (h * FOG_BAND)))
  return (t * t * (3 - 2 * t)) ** 1.8
}
