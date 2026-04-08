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
