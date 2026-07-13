/**
 * Dispatch-readiness loader for the iteration board (#372 bundled finding).
 *
 * For tasks in `todo` status only, computes `@atta/aeg-core`'s
 * `checkDispatchReadiness` — the exact function `bin/verify-dispatch.ts`
 * calls to print `READY`/`NOT READY` — so the board's `Todo` badge can show
 * whether a task is genuinely dispatchable right now. D-120 (2026-07-13)
 * removed the row-adjacency predicate from the gate itself; `priorTask`
 * facts are still assembled below (dormant, feeding a field the gate no
 * longer reads) as dead-but-harmless plumbing — see `dispatch-gate.ts`.
 *
 * Display-only overlay: this NEVER touches `DerivedStatus`/`deriveIteration`
 * and is unrelated to the `blocked` status (D-069's anomaly holding-pen) —
 * same additive discipline as the task-26 assigned-chip (D-059).
 *
 * Fact sources, one implementation each (the verify-dispatch traps):
 *   - per-task forge facts     ← the snapshot `loadIterationSnapshot` already fetched
 *   - readiness verdict        ← `checkDispatchReadiness` (aeg-core, pure)
 *   - rationale                ← `checkIssueRationale` via `buildDispatchGateInput`
 *   - provenance               ← `fetchProvenance` (shared with the CLIs)
 *   - open-issues-by-label     ← `fetchOpenIssuesByLabel` (shared with verify-coherence)
 *   - prior-iteration archival ← same file-scan + label-query recipe as the CLI's
 *                                `resolvePriorIterationArchival`
 *
 * Degrades to an empty map (badge falls back to plain `Todo`) when the forge
 * snapshot is unavailable or no token resolves.
 *
 * SERVER-ONLY.
 */

import 'server-only'
import {
  checkDispatchReadiness,
  fetchOpenIssuesByLabel,
  type DispatchPriorIterationFact,
  type DispatchResult,
  type Iteration,
  type Task
} from '@atta/aeg-core'
import { fetchProvenance, resolveGithubToken } from '@atta/aeg-forge-state'
import { graphql } from '@octokit/graphql'
import { loadActiveIterations } from '../aeg-fs'
import type { IterationSnapshot } from './load-snapshot'
import { buildDispatchGateInput } from './map-dispatch-input'

export async function loadDispatchReadiness(
  iteration: Iteration,
  slug: string,
  snapshot: IterationSnapshot
): Promise<Map<string, DispatchResult>> {
  const empty = new Map<string, DispatchResult>()
  if (snapshot.unavailable || !snapshot.repo) return empty

  const todo = snapshot.derived.tasks.filter((dt) => dt.status === 'todo').map((dt) => dt.task)
  if (todo.length === 0) return empty

  const token = await resolveGithubToken()
  if (!token) return empty
  const { owner, repo } = snapshot.repo

  const taskById = new Map(iteration.tasks.map((t) => [t.id, t]))

  // Row-adjacency prior task per todo task (D-081 — the preceding TABLE ROW,
  // not the Depends-on column). Dormant since D-120: still assembled and
  // passed through, but `checkDispatchReadiness` no longer evaluates it.
  const priorByTaskId = new Map<string, Task | null>()
  for (const t of todo) {
    const idx = iteration.tasks.findIndex((x) => x.id === t.id)
    priorByTaskId.set(t.id, idx > 0 ? (iteration.tasks[idx - 1] ?? null) : null)
  }
  const priorIssues = [
    ...new Set([...priorByTaskId.values()].map((p) => p?.issue).filter((n): n is number => typeof n === 'number'))
  ]

  // Prior-iteration-archival candidates: every OTHER active iteration file,
  // parsed — the CLI's `otherActiveIterationSlugs` recipe.
  const candidates = await readOtherActiveIterations(slug)

  // One batched label query covers this iteration's rationale bodies AND every
  // archival candidate's open-issue count; provenance batches separately.
  const labelSlugs = [slug, ...candidates.map((c) => c.slug)]
  const crossNums = collectCrossIterationDependsOn(todo, taskById)
  const [issuesBySlug, provenanceByIssue, crossIssueClosed] = await Promise.all([
    fetchOpenIssuesByLabel(labelSlugs, owner, repo, token),
    fetchProvenance(priorIssues, owner, repo, token),
    fetchIssueClosed(crossNums, owner, repo, token)
  ])

  const rationaleBodyByIssue = new Map<number, string>()
  for (const issue of issuesBySlug.get(slug) ?? []) rationaleBodyByIssue.set(issue.number, issue.body)

  // Per-project archival resolution — the CLI's `resolvePriorIterationArchival`:
  // a candidate iteration touching the project with ZERO open issues is
  // complete-but-unarchived → blocks; open issues mean it's genuinely active.
  const projects = [...new Set(todo.flatMap((t) => t.projects))]
  const archivalByProject = new Map<string, DispatchPriorIterationFact>()
  for (const project of projects) {
    let found: DispatchPriorIterationFact | null = null
    for (const c of candidates) {
      if (!c.iteration.tasks.some((t) => t.projects.includes(project))) continue
      const openIssues = issuesBySlug.get(c.slug) ?? []
      if (openIssues.length === 0) {
        found = { project, priorIterationSlug: c.slug, archived: false }
        break
      }
    }
    archivalByProject.set(project, found ?? { project, priorIterationSlug: null, archived: false })
  }

  const result = new Map<string, DispatchResult>()
  for (const t of todo) {
    const input = buildDispatchGateInput({
      iterationSlug: slug,
      task: t,
      facts: snapshot.facts,
      taskById,
      rationaleBodyByIssue,
      provenanceByIssue,
      crossIssueClosed,
      priorTask: priorByTaskId.get(t.id) ?? null,
      priorIterationArchival: t.projects.map((p) => archivalByProject.get(p)).filter((f) => f !== undefined)
    })
    result.set(t.id, checkDispatchReadiness(input))
  }
  return result
}

// ---------- internal helpers ----------

async function readOtherActiveIterations(excludeSlug: string): Promise<Array<{ slug: string; iteration: Iteration }>> {
  try {
    const all = await loadActiveIterations()
    return all.filter((it) => it.fileSlug !== excludeSlug).map((it) => ({ slug: it.fileSlug, iteration: it.iteration }))
  } catch {
    return []
  }
}

/** Cross-iteration `#NNN` depends-on edges of the todo tasks (same fact the CLI reads via `gh issue view`). */
function collectCrossIterationDependsOn(todo: Task[], taskById: Map<string, Task>): number[] {
  const nums = new Set<number>()
  for (const t of todo) {
    for (const edge of t.dependsOn) {
      if (taskById.has(edge.trim())) continue
      const m = edge.match(/#(\d+)/)
      if (m) nums.add(Number(m[1]))
    }
  }
  return [...nums]
}

type IssueStatesResponse = { repository: Record<string, { state: 'OPEN' | 'CLOSED' } | null> | null }

async function fetchIssueClosed(
  nums: number[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>()
  if (nums.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })
  const perIssue = nums.map((n) => `i_${n}: issue(number: ${n}) { state }`).join('\n    ')
  const query = `query IssueStates($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    ${perIssue}
  }
}`

  let response: IssueStatesResponse
  try {
    response = await client<IssueStatesResponse>(query, { owner, repo })
  } catch {
    return result
  }
  if (!response.repository) return result

  for (const n of nums) {
    result.set(n, response.repository[`i_${n}`]?.state === 'CLOSED')
  }
  return result
}
