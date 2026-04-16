/**
 * Shared contract between the SSR scheme resolver in next-web-shell.tsx
 * and the client toggle in color-scheme-toggle.tsx. One source of truth
 * for the cookie name, default, and resolution order.
 */

export type ColorScheme = 'light' | 'dark'

export const COLOR_SCHEME_COOKIE = 'atta-color-scheme'
export const COLOR_SCHEME_ATTRIBUTE = 'data-theme'
export const DEFAULT_SCHEME: ColorScheme = 'dark'

/** 1 year — same as shadcn's default theme persistence. */
export const COLOR_SCHEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Resolve scheme: cookie wins, then CMS default, then DEFAULT_SCHEME. */
export function resolveColorScheme(cookieValue: string | undefined, cmsDefault: ColorScheme | undefined): ColorScheme {
  if (cookieValue === 'light' || cookieValue === 'dark') return cookieValue
  if (cmsDefault === 'light' || cmsDefault === 'dark') return cmsDefault
  return DEFAULT_SCHEME
}
