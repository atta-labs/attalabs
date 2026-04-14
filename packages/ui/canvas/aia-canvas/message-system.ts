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

    // Fading trail behind the head
    const trailLen = 14
    for (let s = 1; s <= trailLen; s++) {
      const tTrail = Math.max(0, t - s * 0.04)
      const eTrail = tTrail * tTrail * (3 - 2 * tTrail)
      const tx = msg.fromX + (msg.toX - msg.fromX) * eTrail
      const ty = msg.fromY + (msg.toY - msg.fromY) * eTrail
      ctx.globalAlpha = (1 - s / trailLen) * 0.5
      ctx.fillStyle = colors[0]!
      ctx.beginPath()
      ctx.arc(tx, ty, Math.max(0.5, 2.5 - s * 0.15), 0, Math.PI * 2)
      ctx.fill()
    }

    // Glowing head
    const dg = ctx.createRadialGradient(headX, headY, 0, headX, headY, 14)
    dg.addColorStop(0, '#ffffff')
    dg.addColorStop(0.3, colors[0]!)
    dg.addColorStop(1, 'transparent')
    ctx.globalAlpha = 0.9
    ctx.fillStyle = dg
    ctx.beginPath()
    ctx.arc(headX, headY, 14, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(headX, headY, 3, 0, Math.PI * 2)
    ctx.fill()

    if (msg.progress >= 1) {
      const toSphere = spheres.find((s) => s.id === msg.toSphereId)
      if (toSphere) clusterGlow.set(toSphere.id, 1)
      messages.splice(i, 1)
    }
  }
}
