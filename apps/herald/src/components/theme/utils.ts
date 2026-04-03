/**
 * Client-side theme DOM utilities.
 * Sets CSS custom properties on document.documentElement.
 * Used by both SSR (via generateThemeCSS) and preview mode (via applyThemeToDOM).
 *
 * Adapted from Summon's portal theme utils.
 */

import { cssColorToOklch } from '@herald/cms/utils/oklch'

export interface ThemeData {
  dark?: Record<string, unknown>
  light?: Record<string, unknown>
  typography?: Record<string, string | undefined>
  spacing?: { radius?: string; spacing?: string }
  shadows?: Record<string, string>
}

function camelToKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase()
}

function extractColorValue(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value) return (value as { value: string }).value
  return null
}

function hasSchemeColors(scheme: Record<string, unknown> | undefined): boolean {
  if (!scheme) return false
  return !!(scheme.primary || scheme.background)
}

/**
 * Apply color scheme to DOM — adds/removes dark/light classes on <html>.
 * Does NOT use next-themes to avoid localStorage pollution in iframe preview.
 */
export function applyColorSchemeToDOM(colorScheme: 'dark' | 'light') {
  const root = document.documentElement
  if (colorScheme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
  root.setAttribute('data-theme', colorScheme)
  root.style.colorScheme = colorScheme
}

/**
 * Apply theme values to the DOM as CSS custom properties.
 * Smart fallback: if requested scheme has no colors, uses the other one.
 */
export function applyThemeToDOM(theme: ThemeData, colorScheme?: 'dark' | 'light') {
  const root = document.documentElement
  const isDark = colorScheme
    ? colorScheme === 'dark'
    : root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark'

  const hasDark = hasSchemeColors(theme.dark)
  const hasLight = hasSchemeColors(theme.light)
  let effectiveIsDark = isDark
  if (isDark && !hasDark && hasLight) {
    effectiveIsDark = false
  } else if (!isDark && !hasLight && hasDark) {
    effectiveIsDark = true
  }

  const colors = effectiveIsDark ? theme.dark : theme.light

  if (colors) {
    for (const [key, rawValue] of Object.entries(colors)) {
      const value = extractColorValue(rawValue)
      if (value) {
        root.style.setProperty(`--${camelToKebab(key)}`, cssColorToOklch(value))
      }
    }
  }

  if (theme.typography) {
    for (const [key, value] of Object.entries(theme.typography)) {
      if (value) {
        root.style.setProperty(`--${camelToKebab(key)}`, value)
      }
    }
  }

  if (theme.spacing) {
    if (theme.spacing.radius) root.style.setProperty('--radius', theme.spacing.radius)
    if (theme.spacing.spacing) root.style.setProperty('--spacing', theme.spacing.spacing)
  }

  if (theme.shadows) {
    for (const [key, value] of Object.entries(theme.shadows)) {
      if (value) {
        root.style.setProperty(`--${camelToKebab(key)}`, value)
      }
    }
  }
}
