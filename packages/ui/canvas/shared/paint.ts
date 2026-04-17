// packages/ui/canvas/shared/paint.ts
/**
 * Canvas paint primitives for particle visuals. Single source of truth for the
 * "glowing particle" visual language across fabric.ts, message-system.ts, and
 * use-aia-canvas.ts.
 *
 * THE LIGHT/DARK RULE (applies to every radial glow primitive here):
 *
 *   Dark bg: alpha fills ADD light → radial gradient renders as a bloom.
 *            Core = bright white, outer = full-alpha agent color.
 *
 *   Light bg: alpha fills SUBTRACT light → same gradient renders as grey mud.
 *             Core = saturated agent color at α=1, outer = SAME hue at α=0.25.
 *             The STEPPED alpha (1 → 0.25) is load-bearing — using full alpha
 *             on both stops produces a solid disc that greys out the page.
 *             See `bloomStops()` — always route new primitives through it.
 *
 * Canonical bug (fixed in `ce54784`): paintParticleHead's outer stop was
 * accidentally set to the same full-alpha color as the core, losing the fade.
 * The visible result: grey halos around colored particles in light mode.
 */

import { brightenForLight, withAlpha } from './color-math'
import { isLightTheme } from './theme'

export interface BloomStopsOpts {
  /** Alpha multiplier applied to both returned stops (0-1). Default 1. */
  intensity?: number
  /** Outer stop alpha in light mode (0-1). Default 0.25 — the "whisper". */
  lightOuterAlpha?: number
}

/**
 * Returns the `[coreColor, outerColor]` tuple for a theme-aware radial bloom.
 * Use this wherever you're building a radial gradient for a particle / glow
 * effect — it encodes the stepped-alpha rule that prevents grey-mud on light bg.
 *
 * Dark mode → [white@intensity, agent@intensity]
 * Light mode → [brightened@intensity, brightened@intensity * lightOuterAlpha]
 */
export function bloomStops(agentColor: string, opts: BloomStopsOpts = {}): [string, string] {
  const intensity = opts.intensity ?? 1
  const lightOuterAlpha = opts.lightOuterAlpha ?? 0.25
  if (!isLightTheme()) {
    return [`rgba(255,255,255,${intensity.toFixed(3)})`, withAlpha(agentColor, intensity)]
  }
  const brightened = brightenForLight(agentColor)
  return [withAlpha(brightened, intensity), withAlpha(brightened, intensity * lightOuterAlpha)]
}

export interface ParticleHeadOpts {
  /** Radial glow radius in px. Default 14. */
  radius?: number
  /** Core dot radius in px. Default 3. */
  coreRadius?: number
  /** Overall opacity multiplier (0-1). Default 1. */
  opacity?: number
}

/**
 * Paint a glowing particle head — radial gradient bloom + solid core dot.
 * Agent color carries identity; core is white (dark) or brightened agent
 * color (light). Uses bloomStops() so the light/dark rule is centralized.
 */
export function paintParticleHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  agentColor: string,
  opts: ParticleHeadOpts = {}
): void {
  const radius = opts.radius ?? 14
  const coreRadius = opts.coreRadius ?? 3
  const opacity = opts.opacity ?? 1
  const [coreColor, outerColor] = bloomStops(agentColor)
  const bloomAlpha = (isLightTheme() ? 0.55 : 0.9) * opacity

  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, coreColor)
  grad.addColorStop(0.3, outerColor)
  grad.addColorStop(1, 'transparent')

  ctx.globalAlpha = bloomAlpha
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = opacity
  ctx.fillStyle = coreColor
  ctx.beginPath()
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Paint an agent-colored glow ring around a sphere on message arrival.
 * Caller decays `intensity` across frames. Flat full-alpha agent color for
 * both stops is intentional here — the gradient is small (fits inside a
 * sphere), the outer edge fades via globalAlpha, and the scaled intensity
 * (×0.22 light / ×0.3 dark) already keeps it subtle enough to dodge mud.
 */
export function paintClusterGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  agentColor: string,
  intensity: number
): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, withAlpha(agentColor, 1))
  grad.addColorStop(0.6, withAlpha(agentColor, 1))
  grad.addColorStop(1, 'transparent')
  ctx.globalAlpha = intensity * (isLightTheme() ? 0.22 : 0.3)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}
