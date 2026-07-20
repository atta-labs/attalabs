/**
 * Theme ↔ library compatibility.
 *
 * The `retro` and `brutal` libraries draw a hard border AND a hard offset shadow
 * on every surface. A theme tuned for the soft libraries typically ships a border
 * at 0.14–0.20 alpha — fine under `basic`/`animate`, effectively frameless under a
 * neobrutalist one, where the border IS the design.
 *
 * Before D-131 this was hidden: `globals.css` forced `--border: var(--foreground)`
 * for retro/brutal, overriding whatever border a theme defined. Removing that shim
 * let each theme own its border, which is correct — but it means an un-tuned theme
 * paired with a neobrutalist library now renders without contours.
 *
 * Rather than silently offering broken pairings, the pickers filter: select a
 * neobrutalist library and only themes flagged `neobrutalist` are offered.
 *
 * The flag is EXPLICIT (a schema field), never derived from "has a shadowColor".
 * Deriving it would let a theme drift into the neobrutalist list because someone
 * set an unrelated field, and the real requirement — a solid border that contrasts
 * with the theme's own surfaces — is a judgement call a boolean records honestly.
 */

import type { CMSTheme } from '../types'

/** Libraries whose components draw a hard border + hard offset shadow. */
export const NEOBRUTALIST_LIBRARIES = ['retro', 'brutal'] as const

export function isNeobrutalistLibrary(libraryId: string | null | undefined): boolean {
  if (!libraryId) return false
  // Accepts both the bare id (`retro`) and the document id (`library-retro`).
  const id = libraryId.startsWith('library-') ? libraryId.slice('library-'.length) : libraryId
  return (NEOBRUTALIST_LIBRARIES as readonly string[]).includes(id)
}

/**
 * Themes offerable for a library. Neobrutalist libraries get only tuned themes;
 * every other library gets the full list — a neobrutalist theme has a solid
 * border and a shadow colour, which render perfectly well under basic/animate.
 */
export function themesForLibrary<T extends Pick<CMSTheme, 'neobrutalist'>>(
  themes: T[],
  libraryId: string | null | undefined
): T[] {
  if (!isNeobrutalistLibrary(libraryId)) return themes
  return themes.filter((t) => t.neobrutalist === true)
}

/** Whether a specific theme may be paired with a library. */
export function isThemeCompatible(
  theme: Pick<CMSTheme, 'neobrutalist'> | null | undefined,
  libraryId: string | null | undefined
): boolean {
  if (!theme) return false
  if (!isNeobrutalistLibrary(libraryId)) return true
  return theme.neobrutalist === true
}
