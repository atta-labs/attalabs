/**
 * An iteration's board href, and the reason to show when there isn't one.
 *
 * An iteration's board lives under a project (`/studio/projects/<project>/…`),
 * so an iteration with no project has no board route to point at. That is a
 * real state, not an error. `projects` is the union of TWO sources on the
 * iteration's `iteration:<slug>`-labelled Issues: the `project:<name>` labels
 * AND each Issue body's `**Project:**` field (`@atta/aeg-forge-state`'s
 * `list-tasks.ts`). An iteration resolves to `[]` only when BOTH are absent —
 * a missing `project:*` label alone is not enough, since the field still
 * resolves a board (`state-machine-v1` carries no such label and resolves via
 * its field). Live board-less example at time of writing:
 * `admin-ui-library-picker-v1`, whose one Issue has no label and whose field
 * says the project is none.
 *
 * Both halves live here because the href derivation was duplicated verbatim in
 * `studio/page.tsx` and `studio/iterations/IterationsTabs.tsx`, and the reason
 * has to match wherever a board-less row renders. A row that is silently
 * non-clickable reads as a broken link; it must say why (D-087 — the Studio
 * does not lie by omission, including by omitting an explanation).
 */

import type { IterationSummary } from '@/lib/repo-state'

/** Shown as a `title=` tooltip, and inline on the iteration card.
 *
 * Deliberately says "no project is declared" rather than "no task declares a
 * project": `projects` is also `[]` for an iteration with no tasks at all (an
 * open Milestone with no Issues cut yet), and a reason that asserts tasks exist
 * would be its own small lie in exactly the case this string is meant to
 * explain honestly. */
export const NO_BOARD_REASON = 'No board — no project is declared for this iteration.'

/**
 * The one board-route builder. Takes the project list rather than a summary so
 * the Tasks card — which resolves a board href per *task* (`task.projects`),
 * not per iteration summary — shares this exact rule instead of re-deriving it.
 * An empty first project is treated as absent: a `project:` label with no name
 * would otherwise build `/studio/projects//iterations/<slug>`.
 */
export function boardHref(projects: readonly string[], fileSlug: string): string | null {
  const project = projects[0]
  return project ? `/studio/projects/${project}/iterations/${fileSlug}` : null
}

/** An iteration's board href — its first project's detail route, or null. */
export function iterationHref(it: IterationSummary): string | null {
  return boardHref(it.projects, it.fileSlug)
}
