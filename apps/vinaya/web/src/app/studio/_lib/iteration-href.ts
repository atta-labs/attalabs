/**
 * An iteration's board href, and the reason to show when there isn't one.
 *
 * An iteration's board lives under a project (`/studio/projects/<project>/…`),
 * so an iteration with no project has no board route to point at. That is a
 * real state, not an error: `projects` is derived from the `project:<name>`
 * labels on the iteration's `iteration:<slug>`-labelled Issues, and an
 * iteration whose Issues carry no `project:*` label at all (live example at
 * time of writing: `state-machine-v1`) legitimately resolves to `[]`.
 *
 * Both halves live here because the href derivation was duplicated verbatim in
 * `studio/page.tsx` and `studio/iterations/IterationsTabs.tsx`, and the reason
 * has to match wherever a board-less row renders. A row that is silently
 * non-clickable reads as a broken link; it must say why (D-087 — the Studio
 * does not lie by omission, including by omitting an explanation).
 */

import type { IterationSummary } from '@/lib/repo-state'

/** Shown as a `title=` tooltip, and inline on the iteration card. */
export const NO_BOARD_REASON = 'No board — no task in this iteration declares a project.'

/** An iteration's board href — its first project's detail route, or null. */
export function iterationHref(it: IterationSummary): string | null {
  const project = it.projects[0]
  return project ? `/studio/projects/${project}/iterations/${it.fileSlug}` : null
}
