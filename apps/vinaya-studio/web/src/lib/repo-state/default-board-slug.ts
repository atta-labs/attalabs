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
