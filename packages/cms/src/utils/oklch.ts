/**
 * OKLCH color normalization — converts CSS colors to oklch() at generation time.
 * Stored values in Sanity remain unchanged.
 */

import { converter, parse } from 'culori'

const toOklch = converter('oklch')

function round(n: number, decimals: number): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}

function formatOklch(color: { l: number; c: number; h?: number; alpha?: number }): string {
  const l = round(color.l, 4)
  const c = round(color.c, 4)
  const h = color.h != null && !Number.isNaN(color.h) ? round(color.h, 2) : 'none'
  const alpha = color.alpha != null ? round(color.alpha, 2) : undefined

  if (alpha != null && alpha < 1) {
    return `oklch(${l} ${c} ${h} / ${alpha})`
  }
  return `oklch(${l} ${c} ${h})`
}

export function cssColorToOklch(value: string): string {
  if (!value) return value

  const trimmed = value.trim()

  if (
    trimmed.startsWith('linear-gradient') ||
    trimmed.startsWith('radial-gradient') ||
    trimmed.startsWith('conic-gradient') ||
    trimmed.startsWith('var(') ||
    trimmed.startsWith('oklch(')
  ) {
    return value
  }

  const parsed = parse(trimmed)
  if (!parsed) return value

  const oklch = toOklch(parsed)
  if (!oklch || oklch.l == null || oklch.c == null) return value

  return formatOklch(oklch as { l: number; c: number; h?: number; alpha?: number })
}
