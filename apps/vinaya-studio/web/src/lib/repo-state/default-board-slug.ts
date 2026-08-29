/**
 * Reserved project-route segment for the registry-absent default board (#811)
 * — a view over every projectless tranche, not a real project (mints no
 * `project:default` label, writes nothing to the forge). Lives in its own
 * zero-I/O module, separate from `read-root.ts`, because that module carries
 * `import 'server-only'` — a client component (`tranche-href.ts`'s callers
 * include `TranchesTabs.tsx`, `'use client'`) importing anything from
 * `read-root.ts`, even a re-exported constant, pulls that guard into the
 * client bundle and throws at import time.
 */
export const DEFAULT_BOARD_SLUG = '_default'

/**
 * Appends the synthetic default-board entry to a project-name list UNLESS a
 * real forge-derived project already claims `DEFAULT_BOARD_SLUG` — a real
 * project's own card must always win that slug, never sit beside a second
 * card with the identical `name` (a duplicate React `key`, undefined which
 * of the two ever renders/links correctly). `resolveProjectView` in
 * `read-root.ts` resolves the SAME precedence at the routing layer — the
 * two must never disagree, or a card could link to a board the router then
 * resolves differently.
 */
export function withDefaultBoardEntry<T extends { name: string }>(
  names: readonly T[]
): Array<T | { name: string; label: string }> {
  if (names.some((n) => n.name === DEFAULT_BOARD_SLUG)) return [...names]
  return [...names, { name: DEFAULT_BOARD_SLUG, label: 'All tranches' }]
}
