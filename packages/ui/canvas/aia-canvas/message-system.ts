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
    msg.progress += 0.07

    const t = Math.min(msg.progress, 1)
    const ease = t * t * (3 - 2 * t)

    const headX = msg.fromX + (msg.toX - msg.fromX) * ease
    const headY = msg.fromY + (msg.toY - msg.fromY) * ease

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
      const eTrail = tTrail * tTrail * (3 - 2 * tTrail)
      const tx = msg.fromX + (msg.toX - msg.fromX) * eTrail
      const ty = msg.fromY + (msg.toY - msg.fromY) * eTrail
      ctx.globalAlpha = (1 - s / trailLen) * (isLightTheme() ? 0.7 : 0.5)
      ctx.fillStyle = msgColor
      ctx.beginPath()
      ctx.arc(tx, ty, Math.max(0.5, 2.5 - s * 0.15), 0, Math.PI * 2)
      ctx.fill()
    }

    // Glowing head — shared paint primitive so dark/light rendering matches
    // the fabric.ts Tron particles exactly.
    paintParticleHead(ctx, headX, headY, msgColor)

    if (msg.progress >= 1) {
      if (toSphere) clusterGlow.set(toSphere.id, 1)
      messages.splice(i, 1)
    }
  }
}
