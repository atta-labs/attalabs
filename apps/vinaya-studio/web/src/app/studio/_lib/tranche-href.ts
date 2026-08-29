/**
 * A tranche's board href, and the reason to show when there isn't one.
 *
 * A tranche's board lives under a project (`/studio/projects/<project>/…`),
 * so a tranche whose projects don't resolve to a board has no route to point
 * at. That is a real state, not an error. `projects` is the union of TWO sources
 * on the tranche's `vinaya/tranche:<slug>`-labelled Issues: the `**Project:**`
 * labels AND each Issue body's `**Project:**` field (`@attalabs/aeg-forge-state`'s
 * `list-tasks.ts`). A tranche resolves to `[]` only when BOTH are absent —
 * a missing `project:*` label alone is not enough, since the field still
 * resolves a board (`state-machine-v1` carries no such label and resolves via
 * its field). Live board-less example at time of writing:
 * `admin-ui-library-picker-v1`, whose one Issue has no label and whose field
 * says the project is none.
 *
 * **A declared project must also be registered.** `projects` carries whatever
 * name the Issue declares, but only names in `.vinaya/projects.md`
 * have a project page (`readProject(name)` `notFound()`s otherwise). A retired
 * project name — e.g. `aeg`, whose registry row was deleted when the old AEG
 * Studio was ported to Vinaya — still rides on its archived tranches'
 * Issues, so `deprecation-v1` declares `Project: aeg` yet `/studio/projects/aeg`
 * 404s. `boardHref` therefore takes the set of registered names and links only
 * to a project in it, picking the first *registered* project (a tranche may
 * touch both a live and a retired one). None registered ⇒ board-less, same
 * honest non-clickable render as none declared. The test is "not in
 * `projects.md`", of which "retired" is only the common case — a typo (`vda`)
 * or a project registered later lands here too, rendering board-less rather
 * than surfaced as malformed. `projects.md` itself is the authority: a
 * `Project:` naming an unregistered project is malformed by its own rule, so
 * refusing to link there is that rule, mechanized at the surface.
 *
 * Both halves live here because the href derivation was duplicated verbatim in
 * `studio/page.tsx` and `studio/tranches/TranchesTabs.tsx`, and the reason
 * has to match wherever a board-less row renders. A row that is silently
 * non-clickable reads as a broken link; it must say why (the Studio
 * does not lie by omission, including by omitting an explanation).
 *
 * **Registry-optional (#811).** `boardHref`'s third argument is `registered
 * : ReadonlySet<string> | null` — a real Set is the registry-present path,
 * untouched byte-for-byte from before this task. `null` means no
 * `.vinaya/projects.md` exists at all: there is no registry to gate against,
 * so every forge-declared project name gets a board (`resolveProjectView`,
 * `read-root.ts`, resolves it against the tranches' own already-derived
 * `task.projects` — never re-derived here), and a projectless tranche gets
 * the one reserved `DEFAULT_BOARD_SLUG` board instead of `NO_BOARD_REASON`.
 * The mode switch is registry EXISTENCE, nothing subtler — a caller decides
 * which to pass by checking `findAegRoot() !== null` once per request, not
 * by inspecting whether the registered set happens to be empty (an empty-
 * but-present registry is a real, different state that must still render
 * `NO_BOARD_REASON`, not a forge-derived board).
 */

import type { TrancheSummary } from '@/lib/repo-state'
// A direct leaf import, deliberately bypassing the `@/lib/repo-state` barrel:
// that barrel also re-exports `read-root.ts`, which carries `import
// 'server-only'` — this module is imported by client components
// (`TranchesTabs.tsx`), and importing anything through the barrel, even an
// unrelated value, executes every re-exported module's top level and throws.
import { DEFAULT_BOARD_SLUG } from '@/lib/repo-state/default-board-slug'

export { DEFAULT_BOARD_SLUG }

/** Shown as a `title=` tooltip, and inline on the tranche card.
 *
 * Says "no registered project" — the one wording honest for BOTH board-less
 * cases: a tranche that declares no project at all (also `[]` for an open
 * Milestone with no Issues cut yet — so a reason asserting tasks exist would be
 * its own small lie), AND one whose declared projects are all retired /
 * unregistered. In neither case does a project page exist to link to.
 * Registry-absent tranches never reach this reason — that mode always
 * resolves a board (a named one, or the default). */
export const NO_BOARD_REASON = 'No board — no registered project for this tranche.'

/** Percent-encodes a forge-derived name (or `DEFAULT_BOARD_SLUG`) for use as
 * a `/studio/projects/<segment>` URL segment. A registered name never passes
 * through this — registry rows are already route-safe, and running them
 * through it too would risk the byte-identical guarantee for no reason.
 * Renders (never 500s on) a name with `/`, spaces, or other URL-hostile
 * characters. */
export function forgeProjectSegment(name: string): string {
  return encodeURIComponent(name)
}

/**
 * The one board-route builder. Takes the project list rather than a summary so
 * the Tasks card — which resolves a board href per *task* (`task.projects`),
 * not per tranche summary — shares this exact rule instead of re-deriving it.
 * `registered` is the set of project names in `.vinaya/projects.md`, or
 * `null` when no registry exists (see the module docstring). Registry-present:
 * the href points at the first project that is in the set; an empty or
 * unregistered name is skipped (a `project:` label with no name would
 * otherwise build `/studio/projects//tranches/<slug>`; a retired one, a
 * 404ing route) — unchanged from before this task. Registry-absent: the
 * first declared name (any name — there is nothing to gate against) gets a
 * board, and an empty `projects` list gets the default board.
 */
export function boardHref(
  projects: readonly string[],
  fileSlug: string,
  registered: ReadonlySet<string> | null
): string | null {
  if (registered !== null) {
    const project = projects.find((p) => p && registered.has(p))
    return project ? `/studio/projects/${project}/tranches/${fileSlug}` : null
  }
  const project = projects.find((p) => p)
  const segment = forgeProjectSegment(project ?? DEFAULT_BOARD_SLUG)
  return `/studio/projects/${segment}/tranches/${fileSlug}`
}

/** A tranche's board href — its first registered project's detail route
 *  (or the registry-absent equivalent), never null when `registered` is
 *  `null` (see `boardHref`). */
export function trancheHref(it: TrancheSummary, registered: ReadonlySet<string> | null): string | null {
  return boardHref(it.projects, it.fileSlug, registered)
}
