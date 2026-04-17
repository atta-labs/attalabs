import type { SphereRegistration } from '../aia-context'
import type { DirectMessage } from './types'

const isLight = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
        break
      case gn:
        h = ((bn - rn) / d + 2) * 60
        break
      case bn:
        h = ((rn - gn) / d + 4) * 60
        break
    }
  }
  return { h, s: s * 100, l: l * 100 }
}

// Light-mode brightness fix: boost SATURATION (not lightness) so low-chroma
// agent colors like Strategist's grey-green pop against the light background.
// Mirrors fabric.ts brightenForLight — keep both in sync.
function brightenForLight(color: string): string {
  let h: number
  let s: number
  let l: number
  const hslMatch = color.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*[,/)]/)
  if (hslMatch) {
    h = Number.parseFloat(hslMatch[1]!)
    s = Number.parseFloat(hslMatch[2]!)
    l = Number.parseFloat(hslMatch[3]!)
  } else {
    const hex = color.match(/^#([0-9a-f]{3,8})$/i)
    if (!hex) return color
    const hx = hex[1]!
    const r = hx.length <= 4 ? Number.parseInt(hx[0]! + hx[0]!, 16) : Number.parseInt(hx.slice(0, 2), 16)
    const g = hx.length <= 4 ? Number.parseInt(hx[1]! + hx[1]!, 16) : Number.parseInt(hx.slice(2, 4), 16)
    const b = hx.length <= 4 ? Number.parseInt(hx[2]! + hx[2]!, 16) : Number.parseInt(hx.slice(4, 6), 16)
    ;({ h, s, l } = rgbToHsl(r, g, b))
  }
  const newS = Math.min(75, Math.max(60, s * 1.8))
  const newL = Math.min(60, Math.max(45, l))
  return `hsl(${h.toFixed(1)} ${newS.toFixed(1)}% ${newL.toFixed(1)}%)`
}

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
    const lightMode = isLight()
    const headCore = lightMode ? brightenForLight(msgColor) : '#ffffff'

    // Fading trail behind the head
    const trailLen = 14
    for (let s = 1; s <= trailLen; s++) {
      const tTrail = Math.max(0, t - s * 0.04)
      const eTrail = tTrail * tTrail * (3 - 2 * tTrail)
      const tx = msg.fromX + (msg.toX - msg.fromX) * eTrail
      const ty = msg.fromY + (msg.toY - msg.fromY) * eTrail
      ctx.globalAlpha = (1 - s / trailLen) * 0.5
      ctx.fillStyle = msgColor
      ctx.beginPath()
      ctx.arc(tx, ty, Math.max(0.5, 2.5 - s * 0.15), 0, Math.PI * 2)
      ctx.fill()
    }

    // Glowing head.
    //   Dark mode: white core + agent halo, hot lightbulb look.
    //   Light mode: halo fill is thin (~0.5 alpha) so it doesn't muddy into
    //   grey against the white bg; the vivid core carries the visual pop.
    const dg = ctx.createRadialGradient(headX, headY, 0, headX, headY, 14)
    dg.addColorStop(0, headCore)
    dg.addColorStop(0.3, lightMode ? headCore : msgColor)
    dg.addColorStop(1, 'transparent')
    ctx.globalAlpha = lightMode ? 0.5 : 0.9
    ctx.fillStyle = dg
    ctx.beginPath()
    ctx.arc(headX, headY, 14, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.fillStyle = headCore
    ctx.beginPath()
    ctx.arc(headX, headY, 3, 0, Math.PI * 2)
    ctx.fill()

    if (msg.progress >= 1) {
      if (toSphere) clusterGlow.set(toSphere.id, 1)
      messages.splice(i, 1)
    }
  }
}
