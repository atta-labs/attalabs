// packages/ui/canvas/shared/paint.ts
/**
 * Canvas paint primitives for particle visuals. Encodes the single visual
 * language for "glowing particle heads" and "cluster glows" so dark/light
 * modes render consistently across all callers (fabric.ts, message-system.ts,
 * use-aia-canvas.ts).
 *
 * Key insight driving the asymmetric dark/light treatment: alpha fills ADD
 * light on a dark bg (reads as a glow) but SUBTRACT into grey mud on a light
 * bg. Dark mode can rely on a hot white core + full-alpha agent halo; light
 * mode needs a vivid small core and a whisper-transparent halo so the bloom
 * doesn't muddy the page.
 */

import { brightenForLight, withAlpha } from './color-math'
import { isLightTheme } from './theme'

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
 * Agent color is used for identity; core is white (dark) or brightened agent
 * color (light).
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
  const light = isLightTheme()

  // Light mode: same saturated hue for both gradient stops but STEPPED alpha
  // (1 → 0.25) so the disc fades rapidly from vivid core to whisper before
  // hitting transparent. Using the same full-alpha string for both stops
  // makes the 0–30% arc a solid disc that blends to grey mud on light bg.
  const coreColor = light ? withAlpha(brightenForLight(agentColor), 1) : 'rgba(255,255,255,1)'
  const outerColor = light ? withAlpha(brightenForLight(agentColor), 0.25) : agentColor
  const bloomAlpha = light ? 0.55 * opacity : 0.9 * opacity

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
 * Caller is expected to decay intensity over frames by scaling with a
 * `glow` multiplier (same behaviour as before — kept as a parameter).
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
