/**
 * Shared loader for the Studio's live-status pages (kanban board, task
 * detail). One server entry point that:
 *
 *   1. Resolves `{ owner, repo }` from the local git remote (`resolveRepo`).
 *   2. Resolves issue numbers for tasks: tries the `vinaya/tranche:<slug>` label
 * query first (canonical forge source ); falls back to topology
 *      refs when the label returns nothing (e.g. archived tranches that
 *      pre-date the labeling convention).
 *   3. Calls `fetchForgeFacts` for every task in the tranche that has an
 *      Issue number.
 *   4. Hands the raw `tranche` + facts map to `@atta/aeg-core`'s
 *      `deriveTranche` — derived status is **read from aeg-core, never
 *      re-derived in components** (`tranche-model.md` §3 + task 5 brief).
 *
 * Degrades gracefully when:
 *   - The git remote can't be resolved (`resolveRepo` returns `null`).
 *   - The forge adapter returns `unavailable: true`.
 *   In both cases the derived statuses fall back to `todo` — tranche tasks
 * are committed work; `deriveTranche` emits `todo` when no facts are known.
 *
 * SERVER-ONLY.
 */

import 'server-only'
import {
  deriveTranche,
  fetchForgeFacts,
  fetchForgeTasksByLabel,
  type DerivedTranche,
  type ForgeFacts,
  type Tranche,
  type PrRef
} from '@atta/aeg-core'
import { resolveRepo, type RepoRef } from '@atta/aeg-forge-state'

export type TrancheSnapshot = {
  derived: DerivedTranche
  repo: RepoRef | null
  /**
   * Raw per-task forge facts, keyed by task id. `deriveTranche` already
   * consumed these to produce `derived` — surfaced here too so callers can
   * read facts `deriveTranche` doesn't project into `DerivedStatus` (e.g.
   * `assigned`, which the state model deliberately excludes from status derivation).
   */
  facts: Map<string, ForgeFacts>
  /**
   * Forge identity (number + URL + state) of the PR each task's facts resolved
   * to, keyed by task id — display-only (e.g. linking an in-review badge to
   * its PR). Empty when unavailable.
   */
  prRefs: Map<string, PrRef>
  /** True when forge facts could not be loaded (no token, no remote, network). */
  unavailable: boolean
  /** Diagnostic; logged not surfaced verbatim. */
  reason?: string
}

/**
 * Per-tranche progress counts derived from the forge. Used by tranche
 * cards on the list and project pages to show real status without loading
 * the full derived tranche.
 */
export type TrancheProgress = {
  total: number
  merged: number
  /** in-flight + in-review + changes-requested combined. */
  active: number
  todo: number
  backlog: number
  blocked: number
  unavailable: boolean
}

export async function loadTrancheSnapshot(tranche: Tranche, slug: string): Promise<TrancheSnapshot> {
  const repo = await resolveRepo()
  if (!repo) {
    return {
      derived: deriveTranche(tranche, new Map()),
      repo: null,
      facts: new Map(),
      prRefs: new Map(),
      unavailable: true,
      reason: 'Could not resolve repository (no git remote found and AEG_REPO unset).'
    }
  }

  const resolvedRefs = await resolveTrancheTaskRefs(repo, slug, tranche)
  const snapshot = await fetchForgeFacts({
    owner: repo.owner,
    repo: repo.repo,
    tranche: slug,
    tasks: resolvedRefs
  })

  return {
    derived: deriveTranche(tranche, snapshot.facts),
    repo,
    facts: snapshot.facts,
    prRefs: snapshot.prRefs,
    unavailable: snapshot.unavailable,
    reason: snapshot.reason
  }
}

/**
 * Lightweight progress loader for tranche cards. Uses the same label-based
 * resolution as `loadTrancheSnapshot` but avoids loading the full tranche
 * file — callers pass `taskRefs` from `TrancheSummary.taskRefs`.
 */
export async function loadTrancheProgress(
  taskRefs: Array<{ id: string; issue: number | null }>,
  slug: string
): Promise<TrancheProgress> {
  const total = taskRefs.length
  const repo = await resolveRepo()
  if (!repo) {
    return { total, merged: 0, active: 0, todo: total, backlog: 0, blocked: 0, unavailable: true }
  }

  const resolvedRefs = await resolveRefs(repo, slug, taskRefs)
  const snapshot = await fetchForgeFacts({
    owner: repo.owner,
    repo: repo.repo,
    tranche: slug,
    tasks: resolvedRefs
  })

  if (snapshot.unavailable) {
    return { total, merged: 0, active: 0, todo: total, backlog: 0, blocked: 0, unavailable: true }
  }

  // Use a minimal Tranche (no edge data needed for progress counts).
  const minimal: Tranche = {
    name: slug,
    lifecycle: 'active',
    goal: '',
    tasks: resolvedRefs.map((r) => ({
      id: r.id,
      title: '',
      issue: r.issue,
      projects: [],
      dependsOn: [],
      conflictsWith: [],
      rationaleMarkdown: ''
    })),
    backlog: []
  }
  const derived = deriveTranche(minimal, snapshot.facts)

  let merged = 0
  let active = 0
  let todo = 0
  let backlog = 0
  let blocked = 0
  for (const dt of derived.tasks) {
    switch (dt.status) {
      case 'merged':
        merged++
        break
      case 'in-flight':
      case 'in-review':
      case 'changes-requested':
        active++
        break
      case 'todo':
        todo++
        break
      case 'blocked':
        blocked++
        break
      default:
        backlog++
    }
  }

  return {
    total: derived.tasks.length || total,
    merged,
    active,
    todo,
    backlog,
    blocked,
    unavailable: false
  }
}

// ---------- internal helpers ----------

/**
 * Resolve task refs for `loadTrancheSnapshot`: augments topology null-issue
 * refs with forge-discovered issue numbers via the `vinaya/tranche:<slug>` label.
 */
async function resolveTrancheTaskRefs(
  repo: RepoRef,
  slug: string,
  tranche: Tranche
): Promise<Array<{ id: string; issue: number | null }>> {
  return resolveRefs(
    repo,
    slug,
    tranche.tasks.map((t) => ({ id: t.id, issue: t.issue }))
  )
}

async function resolveRefs(
  repo: RepoRef,
  slug: string,
  topologyRefs: Array<{ id: string; issue: number | null }>
): Promise<Array<{ id: string; issue: number | null }>> {
  if (topologyRefs.every((r) => r.issue !== null)) return topologyRefs

  const forgeRefs = await fetchForgeTasksByLabel({
    owner: repo.owner,
    repo: repo.repo,
    trancheSlug: slug
  })
  if (forgeRefs.length === 0) return topologyRefs

  const forgeMap = new Map(forgeRefs.map((r) => [r.id, r.issue]))
  return topologyRefs.map((r) => ({
    id: r.id,
    issue: r.issue ?? forgeMap.get(r.id) ?? null
  }))
}
