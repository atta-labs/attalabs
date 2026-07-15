export interface ThemeColors {
  foreground: string
  background: string
  card: string
  border: string
  mutedForeground: string
  primary: string
  primaryForeground: string
  warning: string
  destructive: string
  success: string
  fontMono: string
}

/**
 * Resolves theme colors straight from the CSS custom properties NextWebShell injects —
 * never a hardcoded hex/oklch fallback. If a var is ever unset the shape it belongs to
 * simply doesn't paint; that's preferable to guessing a color the theme didn't choose.
 */
export function readThemeColors(el: HTMLElement): ThemeColors {
  const cs = getComputedStyle(el)
  const v = (name: string) => cs.getPropertyValue(name).trim()
  return {
    foreground: v('--foreground'),
    background: v('--background'),
    card: v('--card'),
    border: v('--border'),
    mutedForeground: v('--muted-foreground'),
    primary: v('--primary'),
    primaryForeground: v('--primary-foreground'),
    warning: v('--warning'),
    destructive: v('--destructive'),
    success: v('--success'),
    fontMono: v('--font-mono')
  }
}
