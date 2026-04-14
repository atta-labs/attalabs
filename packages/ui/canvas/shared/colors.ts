/**
 * Shared color resolution utilities for the canvas system.
 *
 * Canvas 2D does not understand CSS custom properties — `var(--x)` is not a
 * valid fillStyle. These helpers read computed values at call time so canvas
 * drawing code always gets a real color string.
 */

/** Read a single CSS custom property from :root. Returns fallback on SSR or empty var. */
function resolveCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/**
 * Resolve a color prop to a canvas-safe string.
 *
 * Handles three cases:
 * - `undefined`      → fallback (default: accent)
 * - `'var(--x)'`     → reads the computed value of --x from :root
 * - any other string → returned as-is (hsl, oklch, hex, named color, etc.)
 */
export function resolveColor(color: string | undefined, fallback = 'hsl(var(--accent))'): string {
  if (!color) return resolveCssVar('--accent', fallback)
  if (color.startsWith('var(')) {
    const varName = color.replace('var(', '').replace(')', '').split(',')[0]!.trim()
    return resolveCssVar(varName, fallback)
  }
  return color
}

/**
 * Returns the three canonical ambient colors used by the canvas particle system.
 * Order: [primary, muted-foreground, foreground]
 *
 * Called once at canvas init — the array is held in a closure for the rAF loop.
 */
export function getThemeColors(): string[] {
  return [
    resolveCssVar('--primary', 'hsl(var(--primary))'),
    resolveCssVar('--muted-foreground', 'hsl(var(--muted-foreground))'),
    resolveCssVar('--foreground', 'hsl(var(--foreground))')
  ]
}
