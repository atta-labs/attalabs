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
export {
  getAttaBranding,
  getAttalabsBranding,
  getHeraldBranding,
  getVadaBranding,
  getVinayaBranding
} from './queries/branding'
export { getLibraries, getLibraryById } from './queries/library'
// Queries
export {
  getAttaConfig,
  getAttalabsConfig,
  getHeraldConfig,
  getProductUiConfig,
  getVadaConfig,
  getVinayaConfig
} from './queries/product-ui-config'
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
  VinayaConfig
} from './types'
export { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from './types'

// Utils
export { buildFaviconIcons } from './utils/favicon'
export { getGoogleFontsUrl, loadThemeFonts } from './utils/font-loader'
export { generateThemeCSS, generateThemeCSSForScheme, transformColorGroup } from './utils/theme'
