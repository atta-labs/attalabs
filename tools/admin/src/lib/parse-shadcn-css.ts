import { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from '@atta/cms'
import { COLOR_FIELD_NAMES, SHADOW_FIELDS, type ThemeColors } from '@/app/[project]/themes/_types'

export interface ParsedShadcnCss {
  light: ThemeColors
  dark: ThemeColors
  typography: { fontSans?: string; fontSerif?: string; fontMono?: string; trackingNormal?: string }
  spacing: { radius?: string; spacing?: string }
  shadows: Record<string, string>
  unknownTokens: string[]
}

function buildCssVarToField(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const field of COLOR_FIELD_NAMES) {
    const cssVar = FIELD_TO_CSS_VAR[field] ?? field
    map[cssVar] = field
  }
  return map
}

function buildCssVarToShadowField(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const field of SHADOW_FIELDS) {
    const cssVar = SHADOW_TO_CSS_VAR[field] ?? field
    map[cssVar] = field
  }
  return map
}

const CSS_VAR_TO_FIELD = buildCssVarToField()
const CSS_VAR_TO_SHADOW = buildCssVarToShadowField()

const TYPOGRAPHY_VAR_TO_FIELD: Record<string, keyof ParsedShadcnCss['typography']> = {
  'font-sans': 'fontSans',
  'font-serif': 'fontSerif',
  'font-mono': 'fontMono',
  'tracking-normal': 'trackingNormal'
}

function extractBlock(css: string, selector: string): string | null {
  const pattern = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\}`, 'i')
  const match = css.match(pattern)
  return match?.[1] ?? null
}

function parseDeclarations(block: string): Array<[string, string]> {
  const decls: Array<[string, string]> = []
  for (const line of block.split(/;\s*/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const name = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!name.startsWith('--')) continue
    decls.push([name.slice(2), value])
  }
  return decls
}

function applyDeclarations(
  decls: Array<[string, string]>,
  target: {
    colors: ThemeColors
    typography: ParsedShadcnCss['typography']
    spacing: ParsedShadcnCss['spacing']
    shadows: Record<string, string>
    unknownTokens: Set<string>
  }
) {
  for (const [name, value] of decls) {
    const colorField = CSS_VAR_TO_FIELD[name]
    if (colorField) {
      target.colors[colorField] = value
      continue
    }
    const shadowField = CSS_VAR_TO_SHADOW[name]
    if (shadowField) {
      target.shadows[shadowField] = value
      continue
    }
    const typoField = TYPOGRAPHY_VAR_TO_FIELD[name]
    if (typoField) {
      target.typography[typoField] = value
      continue
    }
    if (name === 'radius') {
      target.spacing.radius = value
      continue
    }
    if (name === 'spacing') {
      target.spacing.spacing = value
      continue
    }
    target.unknownTokens.add(name)
  }
}

export function parseShadcnCss(css: string): ParsedShadcnCss {
  const light: ThemeColors = {}
  const dark: ThemeColors = {}
  const typography: ParsedShadcnCss['typography'] = {}
  const spacing: ParsedShadcnCss['spacing'] = {}
  const shadows: Record<string, string> = {}
  const unknownTokens = new Set<string>()

  const rootBlock = extractBlock(css, ':root')
  if (rootBlock) {
    applyDeclarations(parseDeclarations(rootBlock), {
      colors: light,
      typography,
      spacing,
      shadows,
      unknownTokens
    })
  }

  const darkBlock = extractBlock(css, '.dark')
  if (darkBlock) {
    applyDeclarations(parseDeclarations(darkBlock), {
      colors: dark,
      typography,
      spacing,
      shadows,
      unknownTokens
    })
  }

  if (!rootBlock && !darkBlock) {
    applyDeclarations(parseDeclarations(css), {
      colors: light,
      typography,
      spacing,
      shadows,
      unknownTokens
    })
  }

  return { light, dark, typography, spacing, shadows, unknownTokens: Array.from(unknownTokens) }
}
