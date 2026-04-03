/**
 * Dynamic Font Loader — loads Google Fonts based on theme typography.
 * Works with any Google Font. Adapted from Summon's font-loader.
 */

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2'
const FONT_LINK_ID = 'herald-theme-fonts'

const SYSTEM_FONTS = ['ui-sans-serif', 'ui-serif', 'ui-monospace', 'system-ui', 'sans-serif', 'serif', 'monospace']

export interface ThemeTypography {
  fontSans?: string
  fontSerif?: string
  fontMono?: string
}

/** Extract primary font name from CSS font-family. Returns null for system fonts. */
function extractFontName(fontFamily: string): string | null {
  const fontName = (fontFamily.split(',')[0] ?? '').trim().replace(/['"]/g, '')
  if (!fontName || SYSTEM_FONTS.includes(fontName.toLowerCase())) {
    return null
  }
  return fontName
}

function buildGoogleFontsUrl(fontNames: string[]): string {
  const familyParams = fontNames.map((name) => `family=${encodeURIComponent(name)}:wght@400;500;600;700`).join('&')
  return `${GOOGLE_FONTS_BASE}?${familyParams}&display=swap`
}

function ensurePreconnectLinks(): void {
  for (const url of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    if (!document.querySelector(`link[rel="preconnect"][href="${url}"]`)) {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = url
      if (url.includes('gstatic')) link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    }
  }
}

/** Load theme fonts client-side by injecting a <link> tag. */
export function loadThemeFonts(typography: ThemeTypography): string[] {
  if (typeof document === 'undefined') return []

  const fontsToLoad: string[] = []
  for (const fontValue of [typography.fontSans, typography.fontSerif, typography.fontMono].filter(
    Boolean
  ) as string[]) {
    const fontName = extractFontName(fontValue)
    if (fontName && !fontsToLoad.includes(fontName)) {
      fontsToLoad.push(fontName)
    }
  }

  const existingLink = document.getElementById(FONT_LINK_ID)
  if (existingLink) existingLink.remove()

  if (fontsToLoad.length === 0) return []

  ensurePreconnectLinks()
  const link = document.createElement('link')
  link.id = FONT_LINK_ID
  link.rel = 'stylesheet'
  link.href = buildGoogleFontsUrl(fontsToLoad)
  document.head.appendChild(link)

  return fontsToLoad
}

/** SSR-safe: build Google Fonts URL for server-side <link> injection. */
export function getGoogleFontsUrl(typography: ThemeTypography): string | null {
  const fontsToLoad: string[] = []
  for (const fontValue of [typography.fontSans, typography.fontSerif, typography.fontMono].filter(
    Boolean
  ) as string[]) {
    const fontName = extractFontName(fontValue)
    if (fontName && !fontsToLoad.includes(fontName)) {
      fontsToLoad.push(fontName)
    }
  }
  return fontsToLoad.length > 0 ? buildGoogleFontsUrl(fontsToLoad) : null
}
