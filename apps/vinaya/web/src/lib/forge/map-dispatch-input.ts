/**
 * Pure mapper: Studio's already-fetched forge facts → `DispatchGateInput` for
 * `@atta/aeg-core`'s `checkDispatchReadiness` (#372 bundled finding). No I/O —
 * isolated from the loader (`dispatch-readiness.ts`) so the fact assembly is
 * testable with fixtures, same split as `map-forge-facts.ts`.
 *
 * This module assembles INPUTS only — every readiness verdict comes from
 * `checkDispatchReadiness` itself, never re-derived here. Each resolver
 * mirrors its CLI counterpart in `packages/aeg-core/bin/verify-dispatch.ts`
 * (`resolveDependsOn`, `resolveConflictsWith`, `resolvePriorTask`):
 *
 *   depends-on merged   ← same-iteration edge: the dep's `prState === 'merged'`;
 *                         when no PR is known (`'none'`), fall back to
 *                         issue-closed — the CLI's exact fallback. Cross-
 *                         iteration `#NNN` edges read the pre-fetched issue
 *                         state; unresolvable edges default to unmerged
 *                         (conservative, same as the CLI).
 *                         One known divergence: a dep whose PR was closed
 *                         WITHOUT merge collapses to `'none'` in `ForgeFacts`
 *                         (map-forge-facts.ts), so it falls to the
 *                         issue-closed fallback where the CLI (which sees the
 *                         closed PR) would say unmerged. That shape is a
 * terminal anomaly (`dropped`/`incoherent`)
 *                         and does not occur on a healthy board.
 *   conflicts-with      ← same-iteration edge: `prState === 'open'`; cross-
 *                         iteration edges default to not-blocking (no PR
 *                         evidence), same as the CLI.
 *   prior task          ← the immediately preceding TABLE ROW (row-adjacency,
 *), not the Depends-on column — resolved by the
 *                         caller; this mapper only attaches its forge facts.
 * Dormant since `checkDispatchReadiness`
 *                         no longer evaluates `priorTask`; still assembled
 *                         here as dead-but-harmless plumbing.
 *   rationale           ← `checkIssueRationale` (aeg-core) against the Issue
 *                         body the loader fetched; an unfetchable body passes
 *                         (CLI parity: a null `gh issue view` passes).
 */

import {
  checkIssueRationale,
  type DispatchConflictsWithFact,
  type DispatchDependsOnFact,
  type DispatchGateInput,
  type DispatchPriorIterationFact,
  type ForgeFacts,
  type Task
} from '@atta/aeg-core'

export type DispatchInputSources = {
  iterationSlug: string
  task: Task
  /** Per-task forge facts, keyed by task id (from `loadIterationSnapshot`). */
  facts: Map<string, ForgeFacts>
  /** Same-iteration topology lookup. */
  taskById: Map<string, Task>
  /** Issue number → Issue body, for this iteration's open issues. */
  rationaleBodyByIssue: Map<number, string>
  /** Prior-task Issue number → provenance-block-present (from `fetchProvenance`). */
  provenanceByIssue: Map<number, boolean>
  /** Cross-iteration `#NNN` depends-on edge → issue closed. */
  crossIssueClosed: Map<number, boolean>
  /** The immediately preceding topology row, or null for the first row. */
  priorTask: Task | null
  priorIterationArchival: DispatchPriorIterationFact[]
}

/** `#NNN` or a prose cell containing `#NNN` (e.g. cross-iteration "other-iter #264"). */
function directIssueNumFromEdge(edge: string): number | null {
  const m = edge.match(/#(\d+)/)
  return m ? Number(m[1]) : null
}

function resolveDependsOn(s: DispatchInputSources): DispatchDependsOnFact[] {
  return s.task.dependsOn.map((edge) => {
    const sameTask = s.taskById.get(edge.trim())
    if (sameTask) {
      const f = s.facts.get(sameTask.id)
      if (!f) return { id: edge, issue: sameTask.issue, merged: false }
      const merged = f.prState === 'merged' ? true : f.prState === 'open' ? false : f.issueState === 'closed'
      return { id: edge, issue: sameTask.issue, merged }
    }
    const directIssue = directIssueNumFromEdge(edge)
    if (directIssue !== null) {
      return { id: edge, issue: directIssue, merged: s.crossIssueClosed.get(directIssue) ?? false }
    }
    return { id: edge, issue: null, merged: false }
  })
}

function resolveConflictsWith(s: DispatchInputSources): DispatchConflictsWithFact[] {
  return s.task.conflictsWith.map((edge) => {
    const sameTask = s.taskById.get(edge.trim())
    if (sameTask) {
      return { id: edge, issue: sameTask.issue, openOrInFlight: s.facts.get(sameTask.id)?.prState === 'open' }
    }
    return { id: edge, issue: directIssueNumFromEdge(edge), openOrInFlight: false }
  })
}

export function buildDispatchGateInput(s: DispatchInputSources): DispatchGateInput {
  const { task } = s
  const taskFacts = task.issue !== null ? s.facts.get(task.id) : undefined

  const body = task.issue !== null ? s.rationaleBodyByIssue.get(task.issue) : undefined

  const priorFacts = s.priorTask ? s.facts.get(s.priorTask.id) : undefined

  return {
    iterationSlug: s.iterationSlug,
    task,
    issue: task.issue !== null && taskFacts ? { number: task.issue, state: taskFacts.issueState } : null,
    issueRationalePass: body !== undefined ? checkIssueRationale(body).status === 'pass' : true,
    dependsOn: resolveDependsOn(s),
    conflictsWith: resolveConflictsWith(s),
    priorTask: s.priorTask
      ? {
          id: s.priorTask.id,
          issue: s.priorTask.issue,
          issueClosed: priorFacts?.issueState === 'closed',
          prMerged: priorFacts?.prState === 'merged',
          hasProvenance: s.priorTask.issue !== null ? (s.provenanceByIssue.get(s.priorTask.issue) ?? false) : false
        }
      : null,
    priorIterationArchival: s.priorIterationArchival
  }
}
