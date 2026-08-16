// @atta/cms — Sanity CMS client, types, queries, and theme utilities

// Client
export { cmsConfig, createProductClient, PROJECT_IDS, type ProductKey } from './client'
export { getProductBranding } from './queries/branding'
export { getLibraries, getLibraryById } from './queries/library'
export { getProductCms, type ProductCms } from './queries/product-cms'
// Queries
export { getProductConfig, getProductUiConfig } from './queries/product-ui-config'
export { getThemeById, getThemeByName, getThemeList, getThemes } from './queries/theme'
// Types
export type {
  AttaConfig,
  AttalabsConfig,
  CMSBranding,
  CMSBrandingFile,
  CMSBrandingImage,
  CMSLibrary,
  CMSTheme,
  ColorScheme,
  HeraldConfig,
  PortalUiConfig,
  ThemeSpacing,
  ThemeTypography,
  VadaConfig,
  VinayaConfig,
  VinayaPortalConfig,
  VinayaStudioConfig
} from './types'
export { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from './types'

// Utils
export { buildFaviconIcons } from './utils/favicon'
export { getGoogleFontsUrl, loadThemeFonts } from './utils/font-loader'
export { generateThemeCSS, generateThemeCSSForScheme, transformColorGroup } from './utils/theme'
export {
  isNeobrutalistLibrary,
  isThemeCompatible,
  NEOBRUTALIST_LIBRARIES,
  themesForLibrary
} from './utils/theme-compatibility'
