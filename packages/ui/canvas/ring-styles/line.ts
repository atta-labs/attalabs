import type { RingStyleContext } from './types'

export function renderLineRing(context: RingStyleContext): void {
  const { ctx, centerX, centerY, radius, sphereCount, colors, completion } = context
  const gapAngle = 0.2

  for (let c = 0; c < completion; c++) {
    const startAngle = (c / sphereCount) * Math.PI * 2 - Math.PI / 2 + gapAngle
    const endAngle = ((c + 1) / sphereCount) * Math.PI * 2 - Math.PI / 2 - gapAngle

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.strokeStyle = colors[0]!
    ctx.globalAlpha = 0.15
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}
