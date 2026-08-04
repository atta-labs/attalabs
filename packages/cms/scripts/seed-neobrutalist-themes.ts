/**
 * Seed the two neobrutalist-ready themes into the central Attalabs dataset.
 *
 * These were authored live in Sanity during `refactor/ui-theme-token-roles`, which
 * meant the values existed only in a published document and in that PR's body —
 * unreproducible into a fresh dataset once the PR merged. This script is the
 * reproducible record.
 *
 * Both carry `neobrutalist: true`, which is what the theme pickers partition on: a
 * neobrutalist library (retro/brutal) offers only these, and the soft libraries offer
 * only the rest. Both therefore satisfy what the flag records — a SOLID border that
 * contrasts with the theme's own surfaces, plus a `shadowColor` that is deliberately
 * NOT the border, so a black border can still cast a visible offset shadow.
 *
 * They differ only in dark mode, by design:
 *   Pastel   — warm beige surfaces, BLACK border (darker than its own surfaces), grey shadow.
 *   Obsidian — true-black page, neutral greys (chroma 0: any warmth reads as a brown cast
 *              at these lightnesses), and the contour INVERTS. Nothing can be darker than
 *              a black page, so border sits ABOVE background and shadowColor above border.
 *              That ordering is what keeps the frame reading as a line plus a lift rather
 *              than two similar greys.
 *
 * Usage: SANITY_API_TOKEN=<token> bun run ./scripts/seed-neobrutalist-themes.ts
 * Idempotent — createOrReplace on fixed document ids.
 */

import { createClient } from '@sanity/client'
import { cmsConfig, PROJECT_IDS } from '../src/client'

const TOKEN = process.env.SANITY_API_TOKEN
if (!TOKEN) {
  console.error('Missing SANITY_API_TOKEN env var (needs write access to the attalabs project).')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_IDS.attalabs,
  dataset: cmsConfig.dataset,
  apiVersion: cmsConfig.apiVersion,
  token: TOKEN,
  useCdn: false
})

/** Shared ramp. Every entry references var(--shadow-color), never var(--border). */
const SHADOWS = {
  shadow2xs: '1px 1px 0 0 var(--shadow-color)',
  shadowXs: '1px 1px 0 0 var(--shadow-color)',
  shadowSm: '2px 2px 0 0 var(--shadow-color)',
  shadow: '3px 3px 0 0 var(--shadow-color)',
  shadowMd: '4px 4px 0 0 var(--shadow-color)',
  shadowLg: '6px 6px 0 0 var(--shadow-color)',
  shadowXl: '10px 10px 0 1px var(--shadow-color)',
  shadow2xl: '16px 16px 0 1px var(--shadow-color)'
}

const SPACING = { radius: '0.375rem', spacing: '0.25rem' }

const TYPOGRAPHY = {
  fontSans: 'ui-sans-serif, system-ui, sans-serif',
  fontSerif: 'ui-serif, Georgia, serif',
  fontMono: 'ui-monospace, SFMono-Regular, monospace',
  trackingNormal: '-0.025em'
}

/** Identical in both themes today — they diverge only in dark. */
const SHARED_LIGHT = {
  background: 'oklch(0.96 0.02 75)',
  foreground: 'oklch(0.210 0.007 78)',
  card: 'oklch(0.98 0.015 75)',
  cardForeground: 'oklch(0.210 0.007 78)',
  popover: 'oklch(0.98 0.015 75)',
  popoverForeground: 'oklch(0.210 0.007 78)',
  primary: 'oklch(0.210 0.007 78)',
  primaryForeground: 'oklch(0.96 0.02 75)',
  primaryHover: 'oklch(0 0 0)',
  secondary: 'oklch(0.90 0.04 75)',
  secondaryForeground: 'oklch(0.210 0.007 78)',
  secondaryHover: 'oklch(0.86 0.04 75)',
  muted: 'oklch(0.92 0.03 75)',
  mutedForeground: 'oklch(0.506 0.019 79)',
  accent: 'oklch(0.90 0.025 75)',
  accentForeground: 'oklch(0.210 0.007 78)',
  border: 'oklch(0 0 0)',
  shadowColor: 'oklch(0 0 0)',
  input: 'oklch(0.13 0.02 283 / 0.04)',
  ring: 'oklch(0.210 0.007 78)',
  destructive: 'oklch(0.55 0.22 27)',
  destructiveForeground: 'oklch(1 0 0)',
  success: 'oklch(0.65 0.15 150)',
  successForeground: 'oklch(0.98 0 0)',
  warning: 'oklch(0.75 0.15 80)',
  warningForeground: 'oklch(0.14 0.01 283)',
  sidebar: 'oklch(0.94 0.025 75)',
  sidebarForeground: 'oklch(0.210 0.007 78)',
  sidebarBorder: 'oklch(0 0 0)',
  sidebarAccent: 'oklch(0.90 0.025 75)',
  sidebarAccentForeground: 'oklch(0.210 0.007 78)',
  sidebarPrimary: 'oklch(0.13 0.02 283)',
  sidebarPrimaryForeground: 'oklch(0.96 0.02 75)',
  sidebarRing: 'oklch(0.13 0.02 283)',
  chart1: 'oklch(0.60 0.20 25)',
  chart2: 'oklch(0.60 0.12 180)',
  chart3: 'oklch(0.40 0.10 250)',
  chart4: 'oklch(0.70 0.15 80)',
  chart5: 'oklch(0.60 0.18 350)'
}

/** Status + chart values shared by both dark schemes. */
const SHARED_DARK_TAIL = {
  destructive: 'oklch(0.55 0.22 27)',
  destructiveForeground: 'oklch(1 0 0)',
  success: 'oklch(0.60 0.15 150)',
  successForeground: 'oklch(0.98 0 0)',
  warning: 'oklch(0.75 0.15 80)',
  warningForeground: 'oklch(0.10 0 0)',
  sidebarPrimary: 'oklch(0.88 0.06 75)',
  sidebarRing: 'oklch(0.88 0.06 75)',
  chart1: 'oklch(0.65 0.20 25)',
  chart2: 'oklch(0.65 0.12 180)',
  chart3: 'oklch(0.70 0.10 250)',
  chart4: 'oklch(0.75 0.15 80)',
  chart5: 'oklch(0.65 0.18 350)'
}

/** Warm beige. border(0) < background(0.200) < shadowColor(0.390). */
const PASTEL_DARK = {
  background: 'oklch(0.200 0.004 70)',
  foreground: 'oklch(0.950 0.012 85)',
  card: 'oklch(0.245 0.003 70)',
  cardForeground: 'oklch(0.950 0.012 85)',
  popover: 'oklch(0.245 0.003 70)',
  popoverForeground: 'oklch(0.950 0.012 85)',
  primary: 'oklch(0.88 0.06 75)',
  primaryForeground: 'oklch(0.13 0.02 283)',
  primaryHover: 'oklch(0.940 0.070 78)',
  secondary: 'oklch(0.280 0.004 75)',
  secondaryForeground: 'oklch(0.950 0.012 85)',
  secondaryHover: 'oklch(0.300 0.012 75)',
  muted: 'oklch(0.295 0.005 78)',
  mutedForeground: 'oklch(0.720 0.018 82)',
  accent: 'oklch(0.345 0.010 85)',
  accentForeground: 'oklch(0.956 0.014 85)',
  border: 'oklch(0 0 0)',
  shadowColor: 'oklch(0.390 0.015 75)',
  input: 'oklch(0.245 0.003 70)',
  ring: 'oklch(0.88 0.06 75)',
  sidebar: 'oklch(0.225 0.004 70)',
  sidebarForeground: 'oklch(0.950 0.012 85)',
  sidebarBorder: 'oklch(0 0 0)',
  sidebarAccent: 'oklch(0.345 0.010 85)',
  sidebarAccentForeground: 'oklch(0.956 0.014 85)',
  sidebarPrimaryForeground: 'oklch(0.13 0.02 283)'
}

/** True black, neutral. background(0) < border(0.205) < shadowColor(0.285) — inverted. */
const OBSIDIAN_DARK = {
  background: 'oklch(0 0 0)',
  foreground: 'oklch(0.950 0.012 85)',
  card: 'oklch(0.165 0 0)',
  cardForeground: 'oklch(0.950 0.012 85)',
  popover: 'oklch(0.165 0 0)',
  popoverForeground: 'oklch(0.950 0.012 85)',
  primary: 'oklch(0.88 0.06 75)',
  primaryForeground: 'oklch(0 0 0)',
  primaryHover: 'oklch(0.940 0.070 78)',
  secondary: 'oklch(0.205 0 0)',
  secondaryForeground: 'oklch(0.950 0.012 85)',
  secondaryHover: 'oklch(0.230 0 0)',
  muted: 'oklch(0.230 0 0)',
  mutedForeground: 'oklch(0.700 0 0)',
  accent: 'oklch(0.275 0 0)',
  accentForeground: 'oklch(0.956 0.014 85)',
  border: 'oklch(0.205 0 0)',
  shadowColor: 'oklch(0.285 0 0)',
  input: 'oklch(0.165 0 0)',
  ring: 'oklch(0.88 0.06 75)',
  sidebar: 'oklch(0.130 0 0)',
  sidebarForeground: 'oklch(0.950 0.012 85)',
  sidebarBorder: 'oklch(0.205 0 0)',
  sidebarAccent: 'oklch(0.275 0 0)',
  sidebarAccentForeground: 'oklch(0.956 0.014 85)',
  sidebarPrimaryForeground: 'oklch(0 0 0)'
}

const THEMES = [
  {
    _id: 'theme-obsidian-retro',
    _type: 'uiTheme',
    name: 'Obsidian - Retro',
    neobrutalist: true,
    light: SHARED_LIGHT,
    dark: { ...OBSIDIAN_DARK, ...SHARED_DARK_TAIL },
    shadows: SHADOWS,
    spacing: SPACING,
    typography: TYPOGRAPHY
  },
  {
    _id: 'theme-pastel-retro',
    _type: 'uiTheme',
    name: 'Pastel - Retro',
    neobrutalist: true,
    light: SHARED_LIGHT,
    dark: { ...PASTEL_DARK, ...SHARED_DARK_TAIL },
    shadows: SHADOWS,
    spacing: SPACING,
    typography: TYPOGRAPHY
  }
]

async function seed() {
  console.log(`Seeding ${THEMES.length} neobrutalist themes → ${PROJECT_IDS.attalabs}/${cmsConfig.dataset}\n`)
  for (const theme of THEMES) {
    await client.createOrReplace(theme)
    console.log(`  ✓ ${theme.name} (${theme._id})`)
  }
  console.log('\nDone. Both are neobrutalist: true — the theme pickers partition on that flag.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
