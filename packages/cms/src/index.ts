// @atta/cms — Sanity CMS client, types, queries, and theme utilities

// Client
export { cmsClient, cmsConfig, cmsWriteClient, createCmsClient } from './client'
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
