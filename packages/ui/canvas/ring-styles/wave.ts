import type { RingStyleContext } from './types'

const RING_WAVES = [
  { amplitude: 3, frequency: 3, speed: 0.025, phase: 0, opacity: 0.14 },
  { amplitude: 2.5, frequency: 4.5, speed: 0.03, phase: 1.2, opacity: 0.1 },
  { amplitude: 4, frequency: 2, speed: 0.02, phase: 2.5, opacity: 0.07 },
  { amplitude: 2, frequency: 6, speed: 0.035, phase: 3.8, opacity: 0.06 },
  { amplitude: 3, frequency: 2.5, speed: 0.028, phase: 5.0, opacity: 0.05 }
]

const POINTS_PER_SEGMENT = 64

function drawWaveSegment(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tableRadius: number,
  startAngle: number,
  endAngle: number,
  progressLimit: number,
  segmentOpacity: number,
  colors: string[],
  time: number
) {
  const arcLen = endAngle - startAngle

  for (let w = 0; w < RING_WAVES.length; w++) {
    const wave = RING_WAVES[w]!
    const t = time * wave.speed

    ctx.beginPath()
    let first = true
    const points = Math.floor(POINTS_PER_SEGMENT * progressLimit)
    for (let i = 0; i <= points; i++) {
      const normI = i / POINTS_PER_SEGMENT
      const angle = startAngle + normI * arcLen

      const edgeDist = Math.min(normI, 1 - normI) * 2
      const envelope = Math.min(1, edgeDist * 4)

      const displacement =
        envelope *
        wave.amplitude *
        (Math.sin(normI * Math.PI * 2 * wave.frequency + t + wave.phase) * 0.6 +
          Math.sin(normI * Math.PI * 2 * wave.frequency * 1.7 + t * 1.3 + wave.phase * 0.7) * 0.3 +
          Math.sin(normI * Math.PI * 2 * wave.frequency * 0.5 + t * 0.7 + wave.phase * 1.4) * 0.1)

      const r = tableRadius + displacement
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r

      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.strokeStyle = colors[w % colors.length]!
    ctx.globalAlpha = wave.opacity * segmentOpacity
    ctx.lineWidth = 1.5 - w * 0.15
    ctx.stroke()
  }
}

export function renderWaveRing(context: RingStyleContext): void {
  const { ctx, centerX, centerY, radius, sphereCount, colors, time, completion, envoyProgress } = context
  const gapAngle = 0.15
  const isComplete = completion === sphereCount

  // Completed segments
  for (let c = 0; c < completion; c++) {
    const startAngle = (c / sphereCount) * Math.PI * 2 - Math.PI / 2 + gapAngle
    const endAngle = ((c + 1) / sphereCount) * Math.PI * 2 - Math.PI / 2 - gapAngle
    const opacity = isComplete ? 1 : 0.6
    drawWaveSegment(ctx, centerX, centerY, radius, startAngle, endAngle, 1, opacity, colors, time)
  }

  // Envoy forming segment
  if (completion < sphereCount && envoyProgress > 0) {
    const c = completion
    const startAngle = (c / sphereCount) * Math.PI * 2 - Math.PI / 2 + gapAngle
    const endAngle = ((c + 1) / sphereCount) * Math.PI * 2 - Math.PI / 2 - gapAngle
    drawWaveSegment(ctx, centerX, centerY, radius, startAngle, endAngle, envoyProgress, 1, colors, time)

    // Leading glow dot
    const currentAngle = startAngle + (endAngle - startAngle) * envoyProgress
    const ex = centerX + Math.cos(currentAngle) * radius
    const ey = centerY + Math.sin(currentAngle) * radius
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 10)
    eg.addColorStop(0, colors[0]!)
    eg.addColorStop(1, 'transparent')
    ctx.globalAlpha = 0.5
    ctx.fillStyle = eg
    ctx.beginPath()
    ctx.arc(ex, ey, 10, 0, Math.PI * 2)
    ctx.fill()
  }
}
