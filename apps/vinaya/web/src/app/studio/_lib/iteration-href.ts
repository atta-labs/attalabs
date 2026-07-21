/**
 * An iteration's board href, and the reason to show when there isn't one.
 *
 * An iteration's board lives under a project (`/studio/projects/<project>/…`),
 * so an iteration whose projects don't resolve to a board has no route to point
 * at. That is a real state, not an error. `projects` is the union of TWO sources
 * on the iteration's `iteration:<slug>`-labelled Issues: the `project:<name>`
 * labels AND each Issue body's `**Project:**` field (`@atta/aeg-forge-state`'s
 * `list-tasks.ts`). An iteration resolves to `[]` only when BOTH are absent —
 * a missing `project:*` label alone is not enough, since the field still
 * resolves a board (`state-machine-v1` carries no such label and resolves via
 * its field). Live board-less example at time of writing:
 * `admin-ui-library-picker-v1`, whose one Issue has no label and whose field
 * says the project is none.
 *
 * **A declared project must also be registered.** `projects` carries whatever
 * name the Issue declares, but only names in `packages/governance/projects.md`
 * have a project page (`readProject(name)` `notFound()`s otherwise). A retired
 * project name — e.g. `aeg`, whose registry row was deleted when the old AEG
 * Studio was ported to Vinaya (D-132) — still rides on its archived iterations'
 * Issues, so `deprecation-v1` declares `Project: aeg` yet `/studio/projects/aeg`
 * 404s. `boardHref` therefore takes the set of registered names and links only
 * to a project in it, picking the first *registered* project (an iteration may
 * touch both a live and a retired one). None registered ⇒ board-less, same
 * honest non-clickable render as none declared. The test is "not in
 * `projects.md`", of which "retired" is only the common case — a typo (`vda`)
 * or a project registered later lands here too, rendering board-less rather
 * than surfaced as malformed. `projects.md` itself is the authority: a
 * `Project:` naming an unregistered project is malformed by its own rule, so
 * refusing to link there is that rule, mechanized at the surface.
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
 * Says "no registered project" — the one wording honest for BOTH board-less
 * cases: an iteration that declares no project at all (also `[]` for an open
 * Milestone with no Issues cut yet — so a reason asserting tasks exist would be
 * its own small lie), AND one whose declared projects are all retired /
 * unregistered. In neither case does a project page exist to link to. */
export const NO_BOARD_REASON = 'No board — no registered project for this iteration.'

/**
 * The one board-route builder. Takes the project list rather than a summary so
 * the Tasks card — which resolves a board href per *task* (`task.projects`),
 * not per iteration summary — shares this exact rule instead of re-deriving it.
 * `registered` is the set of project names in `packages/governance/projects.md`;
 * the href points at the first project that is in it. An empty or unregistered
 * name is skipped (a `project:` label with no name would otherwise build
 * `/studio/projects//iterations/<slug>`; a retired one, a 404ing route).
 */
export function boardHref(
  projects: readonly string[],
  fileSlug: string,
  registered: ReadonlySet<string>
): string | null {
  const project = projects.find((p) => p && registered.has(p))
  return project ? `/studio/projects/${project}/iterations/${fileSlug}` : null
}

/** An iteration's board href — its first registered project's detail route, or null. */
export function iterationHref(it: IterationSummary, registered: ReadonlySet<string>): string | null {
  return boardHref(it.projects, it.fileSlug, registered)
}
