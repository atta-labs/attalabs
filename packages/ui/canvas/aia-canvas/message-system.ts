import { paintParticleHead } from '../shared/paint'
import { isLightTheme } from '../shared/theme'
import type { SphereRegistration } from '../aia-context'
import type { DirectMessage } from './types'

export function renderMessages(
  ctx: CanvasRenderingContext2D,
  messages: DirectMessage[],
  colors: string[],
  spheres: SphereRegistration[],
  clusterGlow: Map<string, number>
): void {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    msg.progress += msg.speed ?? 0.07

    const t = Math.min(msg.progress, 1)

    // Compute position along path — supports optional L-shaped waypoint.
    // With a waypoint, progress 0-0.5 covers from→waypoint, 0.5-1 covers waypoint→to.
    function posAt(p: number): { x: number; y: number } {
      if (!msg.waypoint) {
        const e = p * p * (3 - 2 * p)
        return { x: msg.fromX + (msg.toX - msg.fromX) * e, y: msg.fromY + (msg.toY - msg.fromY) * e }
      }
      if (p <= 0.5) {
        const s = p * 2
        const e = s * s * (3 - 2 * s)
        return { x: msg.fromX + (msg.waypoint.x - msg.fromX) * e, y: msg.fromY + (msg.waypoint.y - msg.fromY) * e }
      }
      const s = (p - 0.5) * 2
      const e = s * s * (3 - 2 * s)
      return { x: msg.waypoint.x + (msg.toX - msg.waypoint.x) * e, y: msg.waypoint.y + (msg.toY - msg.waypoint.y) * e }
    }

    const head = posAt(t)

    // The message carries the identity of its destination agent — tint trail
    // and head with that sphere's color so each arrival reads as that agent's
    // event, not a generic --primary pulse.
    const toSphere = spheres.find((s) => s.id === msg.toSphereId)
    const msgColor = toSphere?.color ?? colors[0]!

    // Fading trail behind the head — solid dots at full agent color (light bg
    // has no bloom problem for thin lines; bloom problem only hits large fills).
    const trailLen = 14
    for (let s = 1; s <= trailLen; s++) {
      const tTrail = Math.max(0, t - s * 0.04)
      const tp = posAt(tTrail)
      ctx.globalAlpha = (1 - s / trailLen) * (isLightTheme() ? 0.7 : 0.5)
      ctx.fillStyle = msgColor
      ctx.beginPath()
      ctx.arc(tp.x, tp.y, Math.max(0.5, 2.5 - s * 0.15), 0, Math.PI * 2)
      ctx.fill()
    }

    // Glowing head — shared paint primitive so dark/light rendering matches
    // the fabric.ts Tron particles exactly.
    paintParticleHead(ctx, head.x, head.y, msgColor)

    if (msg.progress >= 1) {
      if (toSphere) clusterGlow.set(toSphere.id, 1)
      messages.splice(i, 1)
    }
  }
}
