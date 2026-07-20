/**
 * Theme CSS generation — transforms Sanity theme data into CSS variables.
 * Pure functions, SSR-safe, no DOM manipulation.
 */

import type { CMSTheme, ThemeTypography } from '../types'
import { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from '../types'
import { cssColorToOklch } from './oklch'

function extractColorValue(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value) {
    return (value as { value: string }).value
  }
  return null
}

export function transformColorGroup(group: Record<string, unknown> | undefined): Map<string, string> {
  const result = new Map<string, string>()
  if (!group) return result

  for (const [key, rawValue] of Object.entries(group)) {
    const value = extractColorValue(rawValue)
    if (value) {
      const cssKey = FIELD_TO_CSS_VAR[key] || key
      result.set(cssKey, cssColorToOklch(value))
    }
  }
  return result
}

function addTypographyVars(vars: Map<string, string>, typography: ThemeTypography | undefined): void {
  if (!typography) return
  if (typography.fontSans) vars.set('font-sans', typography.fontSans)
  if (typography.fontSerif) vars.set('font-serif', typography.fontSerif)
  if (typography.fontMono) vars.set('font-mono', typography.fontMono)
  if (typography.trackingNormal) vars.set('tracking-normal', typography.trackingNormal)
}

function addSpacingVars(vars: Map<string, string>, spacing: CMSTheme['spacing']): void {
  if (!spacing) return
  if (spacing.radius) vars.set('radius', spacing.radius)
  if (spacing.spacing) vars.set('spacing', spacing.spacing)
}

/**
 * Shadow RAMP (offsets/blur) is scheme-agnostic and intentionally shared by both
 * schemes. Shadow COLOUR is not: it comes from the per-scheme `shadowColor` field
 * in the light/dark colour groups, surfaced as `--shadow-color`. A theme's shadow
 * strings must therefore reference `var(--shadow-color)` and never `var(--border)`
 * — binding them to the border makes a black border produce a black (invisible)
 * shadow, which is what the neobrutalist libraries need to keep separate.
 */
function addShadowVars(vars: Map<string, string>, shadows: CMSTheme['shadows']): void {
  if (!shadows) return
  for (const [key, cssKey] of Object.entries(SHADOW_TO_CSS_VAR)) {
    const value = shadows[key]
    if (value) vars.set(cssKey, value)
  }
}

/** Generate full CSS with :root (light) and .dark (dark) variables */
export function generateThemeCSS(theme: CMSTheme): string {
  const lightVars = transformColorGroup(theme.light)
  const darkVars = transformColorGroup(theme.dark)

  addTypographyVars(lightVars, theme.typography)
  addTypographyVars(darkVars, theme.typography)
  addSpacingVars(lightVars, theme.spacing)
  addSpacingVars(darkVars, theme.spacing)
  addShadowVars(lightVars, theme.shadows)
  addShadowVars(darkVars, theme.shadows)

  const lightBlock = Array.from(lightVars.entries())
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n')

  const darkBlock = Array.from(darkVars.entries())
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n')

  return `:root {\n${lightBlock || '  /* no light tokens */'}\n}\n\n:root[data-theme="dark"], .dark {\n${darkBlock || '  /* no dark tokens */'}\n}\n`
}

/** Generate CSS for a single color scheme only */
export function generateThemeCSSForScheme(theme: CMSTheme, colorScheme: 'light' | 'dark'): string {
  const vars = transformColorGroup(colorScheme === 'dark' ? theme.dark : theme.light)

  addTypographyVars(vars, theme.typography)
  addSpacingVars(vars, theme.spacing)
  addShadowVars(vars, theme.shadows)

  const cssBlock = Array.from(vars.entries())
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n')

  return `:root {\n${cssBlock || '  /* no tokens */'}\n}\n`
}
