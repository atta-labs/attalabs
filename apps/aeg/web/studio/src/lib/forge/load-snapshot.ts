/**
 * Shared loader for the Studio's live-status pages (kanban board, task
 * detail). One server entry point that:
 *
 *   1. Resolves `{ owner, repo }` from the local git remote (`resolveRepo`).
 *   2. Calls `fetchForgeFacts` for every task in the iteration that has an
 *      Issue number.
 *   3. Hands the raw `iteration` + facts map to `@atta/aeg-core`'s
 *      `deriveIteration` — derived status is **read from aeg-core, never
 *      re-derived in components** (`iterations/README.md` §3 + task 5 brief).
 *
 * Degrades gracefully when:
 *   - The git remote can't be resolved (`resolveRepo` returns `null`).
 *   - The forge adapter returns `unavailable: true`.
 *   In both cases the derived statuses fall back to `backlog` — the
 *   conservative read from `deriveIteration` when no facts are known.
 *
 * SERVER-ONLY.
 */

import 'server-only'
import { deriveIteration, type DerivedIteration, type Iteration } from '@atta/aeg-core'
import { fetchForgeFacts } from './fetch-forge-facts'
import { resolveRepo, type RepoRef } from './resolve-repo'

export type IterationSnapshot = {
  derived: DerivedIteration
  repo: RepoRef | null
  /** True when forge facts could not be loaded (no token, no remote, network). */
  unavailable: boolean
  /** Diagnostic; logged not surfaced verbatim. */
  reason?: string
}

export async function loadIterationSnapshot(iteration: Iteration, slug: string): Promise<IterationSnapshot> {
  const repo = await resolveRepo()
  if (!repo) {
    return {
      derived: deriveIteration(iteration, new Map()),
      repo: null,
      unavailable: true,
      reason: 'Could not resolve repository (no git remote found and AEG_REPO unset).'
    }
  }

  const snapshot = await fetchForgeFacts({
    owner: repo.owner,
    repo: repo.repo,
    iteration: slug,
    tasks: iteration.tasks.map((t) => ({ id: t.id, issue: t.issue }))
  })

  return {
    derived: deriveIteration(iteration, snapshot.facts),
    repo,
    unavailable: snapshot.unavailable,
    reason: snapshot.reason
  }
}
