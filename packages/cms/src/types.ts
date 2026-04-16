/**
 * Theme types for Herald — mirrors Summon's theme architecture.
 * Color tokens stored in Sanity, converted to CSS variables at render time.
 */

export interface ThemeTypography {
  fontSans?: string
  fontSerif?: string
  fontMono?: string
  trackingNormal?: string
}

export interface ThemeSpacing {
  radius?: string
  spacing?: string
}

/**
 * Raw theme data from Sanity CMS.
 * Color values can be plain strings or { value: string } (legacy format).
 */
export interface CMSTheme {
  _id: string
  name: string
  light?: Record<string, string | { value: string }>
  dark?: Record<string, string | { value: string }>
  typography?: ThemeTypography
  spacing?: ThemeSpacing
  shadows?: Record<string, string>
}

export type ColorScheme = 'dark' | 'light'

/** Map camelCase field names to kebab-case CSS variable names */
export const FIELD_TO_CSS_VAR: Record<string, string> = {
  cardForeground: 'card-foreground',
  popoverForeground: 'popover-foreground',
  primaryForeground: 'primary-foreground',
  secondaryForeground: 'secondary-foreground',
  mutedForeground: 'muted-foreground',
  accentForeground: 'accent-foreground',
  destructiveForeground: 'destructive-foreground',
  successForeground: 'success-foreground',
  warningForeground: 'warning-foreground',
  chart1: 'chart-1',
  chart2: 'chart-2',
  chart3: 'chart-3',
  chart4: 'chart-4',
  chart5: 'chart-5',
  sidebarForeground: 'sidebar-foreground',
  sidebarPrimary: 'sidebar-primary',
  sidebarPrimaryForeground: 'sidebar-primary-foreground',
  sidebarAccent: 'sidebar-accent',
  sidebarAccentForeground: 'sidebar-accent-foreground',
  sidebarBorder: 'sidebar-border',
  sidebarRing: 'sidebar-ring',
  headerBackground: 'header-background',
  gradientPrimary: 'gradient-primary',
  gradientBackground: 'gradient-background',
  gradientCard: 'gradient-card'
}

export interface CMSLibrary {
  _id: string
  id: string
  name: string
  description?: string
  style?: string
  order?: number
}

export interface CMSBrandingFile {
  _type: 'file'
  url?: string
}

export interface CMSBrandingImage {
  _type: 'image'
  url?: string
}

export interface CMSBrandingFaviconSet {
  ico?: CMSBrandingFile
  png16?: CMSBrandingImage
  png32?: CMSBrandingImage
  png48?: CMSBrandingImage
  png64?: CMSBrandingImage
  png128?: CMSBrandingImage
  png256?: CMSBrandingImage
  png512?: CMSBrandingImage
}

export interface CMSBranding {
  _id: string
  productId: 'herald' | 'atta' | 'vada' | 'vitakka'
  productName: string
  paliRoot?: string
  paliMeaning?: string
  tagline?: string
  bladeDirection?: 'apex-up' | 'apex-down'
  interiorElement?: string
  interiorMeaning?: string
  shapeNotes?: string
  outlineDescription?: string
  outlineUseCases?: string
  outlineMinSizePx?: number
  solidDescription?: string
  solidUseCases?: string
  solidMinSizePx?: number
  clearSpace?: string
  forbidden?: string[]
  logoOutlineLight?: CMSBrandingFile
  logoOutlineDark?: CMSBrandingFile
  logoSolidLight?: CMSBrandingFile
  logoSolidDark?: CMSBrandingFile
  logoLockupOutlineLight?: CMSBrandingFile
  logoLockupOutlineDark?: CMSBrandingFile
  logoLockupSolidLight?: CMSBrandingFile
  logoLockupSolidDark?: CMSBrandingFile
  appleTouchIcon?: CMSBrandingImage
  faviconLight?: CMSBrandingFaviconSet
  faviconDark?: CMSBrandingFaviconSet
}

/** Shared shape for Herald, Atta, Vitakka, and Vada CMS singletons */
export interface PortalUiConfig {
  _id: string
  userInterface: {
    theme: CMSTheme | null
    colorScheme: ColorScheme
    library: CMSLibrary | null
  }
}

export type HeraldConfig = PortalUiConfig
export type AttaConfig = PortalUiConfig
export type VitakkaConfig = PortalUiConfig
export type VadaConfig = PortalUiConfig

export const SHADOW_TO_CSS_VAR: Record<string, string> = {
  shadow2xs: 'shadow-2xs',
  shadowXs: 'shadow-xs',
  shadowSm: 'shadow-sm',
  shadow: 'shadow',
  shadowMd: 'shadow-md',
  shadowLg: 'shadow-lg',
  shadowXl: 'shadow-xl',
  shadow2xl: 'shadow-2xl'
}
