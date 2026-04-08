import type { RingStyleContext } from './types'

interface RingParticle {
  angle: number
  radiusOffset: number
  speed: number
  size: number
  opacity: number
}

let ringParticles: RingParticle[] = []
let initialized = false

function initParticles(sphereCount: number) {
  if (initialized) return
  initialized = true
  const count = sphereCount * 20
  ringParticles = []
  for (let i = 0; i < count; i++) {
    ringParticles.push({
      angle: Math.random() * Math.PI * 2,
      radiusOffset: (Math.random() - 0.5) * 6,
      speed: 0.0005 + Math.random() * 0.001,
      size: 0.5 + Math.random() * 1,
      opacity: 0.1 + Math.random() * 0.15
    })
  }
}

export function renderParticleRing(context: RingStyleContext): void {
  const { ctx, centerX, centerY, radius, sphereCount, colors, time, completion } = context
  initParticles(sphereCount)

  const visibleFraction = completion / sphereCount

  for (const p of ringParticles) {
    p.angle += p.speed

    const normalizedAngle = ((p.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    if (normalizedAngle / (Math.PI * 2) > visibleFraction && visibleFraction < 1) continue

    const r = radius + p.radiusOffset + Math.sin(time * 0.01 + p.angle * 3) * 2
    const x = centerX + Math.cos(p.angle - Math.PI / 2) * r
    const y = centerY + Math.sin(p.angle - Math.PI / 2) * r

    ctx.beginPath()
    ctx.arc(x, y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = colors[0]!
    ctx.globalAlpha = p.opacity
    ctx.fill()
  }
}
