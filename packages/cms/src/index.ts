// @atta/cms — Sanity CMS client, types, queries, and theme utilities

// Client
export { cmsClient, cmsConfig, cmsWriteClient, createCmsClient } from './client'
// Queries
export { getHeraldConfig } from './queries/herald-config'
export { getLibraries, getLibraryById } from './queries/library'
export { getThemeById, getThemeByName, getThemeList, getThemes } from './queries/theme'
// Types
export type { CMSLibrary, CMSTheme, ColorScheme, HeraldConfig, ThemeSpacing, ThemeTypography } from './types'
export { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from './types'

// Utils
export { generateThemeCSS, generateThemeCSSForScheme } from './utils/theme'
