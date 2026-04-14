import type { RingRegistration, SphereRegistration } from '../aia-context'

/**
 * Draws semi-transparent background fills for the ring interior and all spheres.
 * Ring first (large circle), spheres second (small circles) so sphere bgs paint over ring bg.
 * Ring bg fades in smoothly once all ring segments are revealed.
 *
 * Returns the updated ringBgFade value for the next frame.
 */
export function renderBgFills(
  ctx: CanvasRenderingContext2D,
  rings: RingRegistration[],
  spheres: SphereRegistration[],
  bgColor: string,
  ringCompletion: number,
  ringBgFade: number
): number {
  ctx.fillStyle = bgColor

  for (const ring of rings) {
    const ringClosed = ringCompletion >= ring.sphereCount
    ringBgFade = ringClosed ? Math.min(1, ringBgFade + 0.008) : Math.max(0, ringBgFade - 0.02)
    if (ringBgFade > 0) {
      ctx.globalAlpha = (ring.bgOpacity ?? 0.5) * ringBgFade
      ctx.beginPath()
      ctx.arc(ring.centerX, ring.centerY, ring.radius - 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  for (const sphere of spheres) {
    if (!sphere.solidBg) continue
    ctx.globalAlpha = sphere.bgOpacity ?? 0.5
    ctx.beginPath()
    ctx.arc(sphere.x, sphere.y, sphere.radius - 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  return ringBgFade
}
