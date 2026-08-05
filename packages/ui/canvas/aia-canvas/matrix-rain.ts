import { MATRIX_CHARS } from '../shared/constants'
import type { RingRegistration, SphereRegistration } from '../aia-context'
import type { MatrixDrop, RingChar } from './types'

export function renderSphereMatrix(
  ctx: CanvasRenderingContext2D,
  sphere: SphereRegistration,
  matrixDrops: Map<string, MatrixDrop[]>
): void {
  if (!sphere.showMatrix || sphere.state === 'idle') {
    // Drop the column on the way out. Without this the drops just stop being advanced and
    // sit frozen wherever they were, so the next time the sphere is switched back on a
    // full-height column of rain reappears in one frame instead of falling from the top.
    // That only shows up on a sphere whose `showMatrix` is toggled rather than left on.
    matrixDrops.delete(sphere.id)
    return
  }

  let drops = matrixDrops.get(sphere.id)
  if (!drops) {
    drops = []
    matrixDrops.set(sphere.id, drops)
  }

  const clipR = sphere.radius - 4
  const spawnRate = sphere.state === 'speaking' ? 0.8 : 0.4

  if (Math.random() < spawnRate) {
    const xOffset = (Math.random() - 0.5) * clipR * 1.6
    const palette = sphere.matrixColors ?? [sphere.color]
    drops.push({
      x: sphere.x + xOffset,
      y: sphere.y - clipR,
      speed: 0.4 + Math.random() * 0.6,
      char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!,
      life: 1,
      color: palette[Math.floor(Math.random() * palette.length)]!
    })
  }

  ctx.save()
  ctx.beginPath()
  ctx.arc(sphere.x, sphere.y, clipR, 0, Math.PI * 2)
  ctx.clip()

  for (let d = drops.length - 1; d >= 0; d--) {
    const drop = drops[d]!
    drop.y += drop.speed
    const vertProgress = (drop.y - (sphere.y - clipR)) / (clipR * 2)
    drop.life = 1 - vertProgress
    if (Math.random() < 0.05) {
      drop.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!
    }
    if (drop.y > sphere.y + clipR || drop.life <= 0) {
      drops.splice(d, 1)
      continue
    }
    const intensity = sphere.state === 'complete' ? 0.45 : 0.85
    ctx.globalAlpha = Math.max(0.3, drop.life) * intensity * (sphere.matrixOpacity ?? 1)
    ctx.fillStyle = drop.color
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(drop.char, drop.x, drop.y)
  }
  ctx.restore()
}

export function renderRingMatrix(
  ctx: CanvasRenderingContext2D,
  ring: RingRegistration,
  spheres: SphereRegistration[],
  fallbackColors: string[],
  ringChars: Map<string, RingChar[]>
): void {
  if (!ring.thinking) return

  let chars = ringChars.get(ring.id)
  if (!chars) {
    chars = []
    ringChars.set(ring.id, chars)
  }

  const clipR = ring.radius
  if (Math.random() < 0.8) {
    const xOffset = (Math.random() - 0.5) * clipR * 1.8
    chars.push({
      x: ring.centerX + xOffset,
      y: ring.centerY - clipR,
      speed: 0.8 + Math.random() * 1.2,
      char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!,
      life: 1,
      color:
        spheres.length > 0
          ? spheres[Math.floor(Math.random() * spheres.length)]!.color
          : fallbackColors[Math.floor(Math.random() * fallbackColors.length)]!
    })
  }

  ctx.save()
  ctx.beginPath()
  ctx.arc(ring.centerX, ring.centerY, clipR, 0, Math.PI * 2)
  ctx.clip()
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'

  for (let i = chars.length - 1; i >= 0; i--) {
    const c = chars[i]!
    c.y += c.speed
    const vertProgress = (c.y - (ring.centerY - clipR)) / (clipR * 2)
    c.life = 1 - vertProgress
    if (Math.random() < 0.05) {
      c.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!
    }
    if (c.y > ring.centerY + clipR || c.life <= 0) {
      chars.splice(i, 1)
      continue
    }
    ctx.globalAlpha = Math.max(0.3, c.life) * 0.85 * (ring.matrixOpacity ?? 1)
    ctx.fillStyle = c.color
    ctx.fillText(c.char, c.x, c.y)
  }
  ctx.restore()
}
