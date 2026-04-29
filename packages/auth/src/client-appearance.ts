import { buildClerkAppearance } from './clerk-appearance'

/**
 * Reads resolved CSS custom properties from the document root and builds
 * a Clerk appearance object. Called client-side so it always reflects the
 * current color scheme, including after toggling dark/light without a
 * full-page navigation.
 */
export function computeClerkAppearance(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  const style = getComputedStyle(document.documentElement)
  const scheme = (document.documentElement.getAttribute('data-theme') ?? 'dark') as 'light' | 'dark'
  const get = (v: string) => style.getPropertyValue(`--${v}`).trim()
  return buildClerkAppearance(
    {
      background: get('background'),
      foreground: get('foreground'),
      card: get('card'),
      border: get('border'),
      primary: get('primary'),
      primaryForeground: get('primary-foreground'),
      muted: get('muted'),
      mutedForeground: get('muted-foreground'),
      destructive: get('destructive')
    },
    scheme,
    get('font-sans') || undefined,
    get('radius') || undefined
  )
}
