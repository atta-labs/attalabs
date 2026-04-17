/**
 * Light/dark theme detection, cached per frame.
 *
 * Canvas renderers call refreshThemeCache() once at the top of each rAF frame;
 * everything downstream (color adapters, paint primitives) reads isLightTheme()
 * without hitting the DOM again.
 *
 * Source of truth: <html data-theme="light|dark">, set by NextWebShell (SSR)
 * and toggled by color-scheme-toggle.tsx. Authoritative — no need to parse
 * --foreground L channel.
 */
let _isLight = false

export function refreshThemeCache(): void {
  if (typeof document === 'undefined') return
  _isLight = document.documentElement.getAttribute('data-theme') === 'light'
}

export function isLightTheme(): boolean {
  return _isLight
}
