/**
 * Pure color format conversions and theme-aware color adjustments for the
 * canvas paint pipeline.
 *
 * Inputs arrive in any of three forms depending on how upstream code stored
 * them: CSS hsl() strings, hex `#rrggbb`, or rgb()/rgba() strings (Chrome
 * sometimes normalizes custom properties to hex). Every function here accepts
 * all three.
 */

import { isLightTheme } from './theme'

export interface Hsl {
  h: number // 0-360
  s: number // 0-100
  l: number // 0-100
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
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

/**
 * Parse any canvas-friendly color string to HSL. Returns null if unrecognised.
 * Handles hsl()/hsla() (space- or comma-separated, optional `deg`), hex #rgb/#rrggbb,
 * and rgb(r, g, b) / rgba(r, g, b, a).
 */
export function parseColor(color: string): Hsl | null {
  const hslMatch = color.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*[,/)]/)
  if (hslMatch) {
    return {
      h: Number.parseFloat(hslMatch[1]!),
      s: Number.parseFloat(hslMatch[2]!),
      l: Number.parseFloat(hslMatch[3]!)
    }
  }
  const hex = color.match(/^#([0-9a-f]{3,8})$/i)
  if (hex) {
    const h = hex[1]!
    const r = h.length <= 4 ? Number.parseInt(h[0]! + h[0]!, 16) : Number.parseInt(h.slice(0, 2), 16)
    const g = h.length <= 4 ? Number.parseInt(h[1]! + h[1]!, 16) : Number.parseInt(h.slice(2, 4), 16)
    const b = h.length <= 4 ? Number.parseInt(h[2]! + h[2]!, 16) : Number.parseInt(h.slice(4, 6), 16)
    return rgbToHsl(r, g, b)
  }
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) {
    return rgbToHsl(Number.parseInt(rgb[1]!, 10), Number.parseInt(rgb[2]!, 10), Number.parseInt(rgb[3]!, 10))
  }
  return null
}

/**
 * Wrap any color string with an alpha component, producing a canvas-safe
 * hsla/rgba string. Returns white if the input is unparseable.
 */
export function withAlpha(color: string, alpha: number): string {
  const hsl = parseColor(color)
  if (hsl) return `hsla(${hsl.h.toFixed(1)}, ${hsl.s.toFixed(1)}%, ${hsl.l.toFixed(1)}%, ${alpha.toFixed(3)})`
  return `rgba(255,255,255,${alpha.toFixed(3)})`
}

/**
 * Light-mode visibility fix for agent colors. Boosts saturation (not lightness)
 * so low-chroma palettes like Strategist `hsl(119 21% 45%)` read with the same
 * visual weight as Critic's already-saturated red. Dark-mode passthrough.
 *
 * Why saturation, not lightness: lightening a low-chroma color on a light bg
 * just desaturates further into grey — the mistake that drove this refactor.
 */
export function brightenForLight(color: string): string {
  if (!isLightTheme()) return color
  const hsl = parseColor(color)
  if (!hsl) return color
  const newS = Math.min(75, Math.max(60, hsl.s * 1.8))
  const newL = Math.min(60, Math.max(45, hsl.l))
  return `hsl(${hsl.h.toFixed(1)} ${newS.toFixed(1)}% ${newL.toFixed(1)}%)`
}

/**
 * Read --foreground CSS variable and return an oklch string with the given
 * alpha. Used for theme-aware strokes (grid lines, halo overlays) that are
 * conceptually "ink" — white on dark bg, near-black on light bg.
 */
export function fgAt(alpha: number): string {
  if (typeof document === 'undefined') return `rgba(0,0,0,${alpha})`
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()
  const inner = raw.match(/^oklch\(\s*(.+?)\s*\)$/)?.[1] ?? raw
  const channels = inner.replace(/none/gi, '0')
  return channels ? `oklch(${channels} / ${alpha.toFixed(3)})` : `rgba(0,0,0,${alpha})`
}
