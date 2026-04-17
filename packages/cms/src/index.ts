// @atta/cms — Sanity CMS client, types, queries, and theme utilities

// Client
export {
  cmsClient,
  cmsConfig,
  cmsWriteClient,
  createCmsClient,
  createProductClient,
  PROJECT_IDS,
  type ProductKey
} from './client'
export { getAttaBranding, getHeraldBranding, getVadaBranding, getVitakkaBranding } from './queries/branding'
export { getLibraries, getLibraryById } from './queries/library'
// Queries
export {
  getAttaConfig,
  getHeraldConfig,
  getProductUiConfig,
  getVadaConfig,
  getVitakkaConfig
} from './queries/product-ui-config'
export { getThemeById, getThemeByName, getThemeList, getThemes } from './queries/theme'
// Types
export type {
  AttaConfig,
  CMSBranding,
  CMSBrandingFaviconSet,
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
  VitakkaConfig
} from './types'
export { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from './types'

// Utils
export { getGoogleFontsUrl, loadThemeFonts } from './utils/font-loader'
export { generateThemeCSS, generateThemeCSSForScheme, transformColorGroup } from './utils/theme'
