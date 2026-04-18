import { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from '@atta/cms'
import type { ThemeEditorData } from '@/app/themes/_types'

const TYPOGRAPHY_FIELD_TO_CSS_VAR: Record<string, string> = {
  fontSans: 'font-sans',
  fontSerif: 'font-serif',
  fontMono: 'font-mono',
  trackingNormal: 'tracking-normal'
}

type Decl = [name: string, value: string]

function extractColorValue(value: unknown): string | null {
  if (typeof value === 'string') return value.length > 0 ? value : null
  if (value && typeof value === 'object' && 'value' in value) {
    const v = (value as { value?: unknown }).value
    return typeof v === 'string' && v.length > 0 ? v : null
  }
  return null
}

function flattenColors(colors: Record<string, unknown> | undefined): Decl[] {
  if (!colors) return []
  const out: Decl[] = []
  for (const [field, raw] of Object.entries(colors)) {
    const value = extractColorValue(raw)
    if (!value) continue
    const cssVar = FIELD_TO_CSS_VAR[field as keyof typeof FIELD_TO_CSS_VAR] ?? field
    out.push([cssVar, value])
  }
  return out
}

function flattenSharedTokens(data: ThemeEditorData): Decl[] {
  const out: Decl[] = []
  if (data.typography) {
    for (const [field, value] of Object.entries(data.typography)) {
      if (typeof value !== 'string' || !value) continue
      const cssVar = TYPOGRAPHY_FIELD_TO_CSS_VAR[field] ?? field
      out.push([cssVar, value])
    }
  }
  if (data.spacing?.radius) out.push(['radius', data.spacing.radius])
  if (data.spacing?.spacing) out.push(['spacing', data.spacing.spacing])
  if (data.shadows) {
    for (const [field, value] of Object.entries(data.shadows)) {
      if (typeof value !== 'string' || !value) continue
      const cssVar = SHADOW_TO_CSS_VAR[field as keyof typeof SHADOW_TO_CSS_VAR] ?? field
      out.push([cssVar, value])
    }
  }
  return out
}

function formatBlock(selector: string, decls: Decl[]): string {
  const lines = decls.map(([name, value]) => `  --${name}: ${value};`).join('\n')
  return `${selector} {\n${lines}\n}`
}

export function exportShadcnCss(data: ThemeEditorData): string {
  const blocks: string[] = []

  const rootEntries = [...flattenColors(data.light), ...flattenSharedTokens(data)]
  if (rootEntries.length) blocks.push(formatBlock(':root', rootEntries))

  const darkEntries = flattenColors(data.dark)
  if (darkEntries.length) blocks.push(formatBlock('.dark', darkEntries))

  return blocks.join('\n\n')
}
