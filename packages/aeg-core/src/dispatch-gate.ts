/**
 * Dispatch-readiness composition (aeg-governance-hardening task 11, #324).
 * Pure — no `fs`, no `fetch`. Composes the forge/rationale/provenance/
 * archival facts the CLI shim (`bin/verify-dispatch.ts`) gathers (reusing
 * `parseIteration`, `hasProvenance`, `taskRefFromBranch`,
 * `checkIssueRationale`, `fetchProvenance` — never re-implementing any of
 * them) into one `{ ready, blockers }` verdict, one blocker string per
 * failing predicate.
 *
 * Every predicate here mechanizes a prose precondition that `roles/
 * developer.md`'s entry gate and `contracts/brief-developer.md` currently
 * state as something the Developer must re-derive by hand — the exact gap
 * this task exists to close: four Developer agents independently re-derived
 * (and stopped on) the same archival fact from scratch, at real token cost,
 * hours after it first became true (aeg-governance-hardening's 2026-07-02/03
 * live-fire wave).
 *
 * Message style mirrors `coherence-checks.ts`'s A1/A2/T2/etc. family: one
 * line per failure, naming the exact task/Issue/PR involved.
 */

import type { Task } from './types'

export type DispatchIssueFact = { number: number; state: 'open' | 'closed' } | null

export type DispatchEdgeFact = {
  /** The edge's target task id, as written in the topology's depends-on/conflicts-with cell. */
  id: string
  /** The target task's Issue number, if known — for message readability only. */
  issue: number | null
}

export type DispatchDependsOnFact = DispatchEdgeFact & { merged: boolean }

export type DispatchConflictsWithFact = DispatchEdgeFact & { openOrInFlight: boolean }

export type DispatchPriorTaskFact = {
  id: string
  issue: number | null
  issueClosed: boolean
  prMerged: boolean
  hasProvenance: boolean
}

export type DispatchPriorIterationFact = {
  project: string
  /** null when this project has no prior iteration at all — the gate passes trivially for it. */
  priorIterationSlug: string | null
  archived: boolean
}

export type DispatchGateInput = {
  iterationSlug: string
  /** The topology row for this task, as parsed by `parseIteration`. */
  task: Task
  /** null when the task has no Issue (#TBD/blank) OR the Issue number doesn't resolve on the forge (phantom ref). */
  issue: DispatchIssueFact
  /** `checkIssueRationale` result for this task's Issue — irrelevant (treated as passing) when `issue` is null. */
  issueRationalePass: boolean
  dependsOn: DispatchDependsOnFact[]
  conflictsWith: DispatchConflictsWithFact[]
  /** The immediately-prior task in this same iteration's topology, or null when this is the first task. */
  priorTask: DispatchPriorTaskFact | null
  /** One entry per project named in `task.projects`. */
  priorIterationArchival: DispatchPriorIterationFact[]
}

export type DispatchResult = { ready: boolean; blockers: string[] }

export function checkDispatchReadiness(input: DispatchGateInput): DispatchResult {
  const { iterationSlug, task } = input
  const taskLabel = `task ${task.id} (iteration ${iterationSlug})`
  const blockers: string[] = []

  // Issue-existence (D-054) — the topology row itself has no Issue number.
  if (task.issue === null) {
    blockers.push(
      `dispatch-gate issue-existence: ${taskLabel} has no Issue (#TBD or blank) in the topology — not dispatchable until the Planner cuts the Issue (D-054).`
    )
  } else if (input.issue === null) {
    // Row names an Issue number, but it doesn't resolve on the forge — phantom ref (T1's fail class).
    blockers.push(
      `dispatch-gate issue-existence: ${taskLabel} names Issue #${task.issue}, but it does not resolve to a real GitHub Issue (phantom reference).`
    )
  }

  // Planner-rationale completeness (D-078, R1) — only evaluable when the Issue itself resolved.
  if (input.issue !== null && !input.issueRationalePass) {
    blockers.push(
      `dispatch-gate rationale: Issue #${input.issue.number} for ${taskLabel} fails the D-078 rationale gate (checkIssueRationale) — the Planner must complete the eight-field rationale before this task is dispatchable.`
    )
  }

  // Depends-on merged.
  for (const dep of input.dependsOn) {
    if (!dep.merged) {
      const issueStr = dep.issue !== null ? ` (#${dep.issue})` : ''
      blockers.push(
        `dispatch-gate depends-on: ${taskLabel} depends on ${dep.id}${issueStr}, whose PR is not merged yet — not dispatchable, it serializes behind it.`
      )
    }
  }

  // Conflicts-with not open/in-flight.
  for (const c of input.conflictsWith) {
    if (c.openOrInFlight) {
      const issueStr = c.issue !== null ? ` (#${c.issue})` : ''
      blockers.push(
        `dispatch-gate conflicts-with: ${taskLabel} conflicts with ${c.id}${issueStr}, whose PR is open or in-flight — not dispatchable until it merges.`
      )
    }
  }

  // Prior-task archival — all three predicates (Issue closed, PR merged, provenance present).
  // `input.priorTask` is the immediately preceding TABLE ROW, not a `Depends-on`
  // edge — intentional (D-081). Every earlier row's full archival is the
  // freshness guarantee for this task's premises, independent of whether that
  // row is a declared dependency. See `resolvePriorTask` in bin/verify-dispatch.ts.
  if (input.priorTask) {
    const p = input.priorTask
    const owed: string[] = []
    if (!p.issueClosed) owed.push('Issue not closed')
    if (!p.prMerged) owed.push('PR not merged to main')
    if (!p.hasProvenance) owed.push('provenance block absent')
    if (owed.length > 0) {
      const issueStr = p.issue !== null ? ` (#${p.issue})` : ''
      blockers.push(
        `dispatch-gate prior-archival: prior task ${p.id}${issueStr} in iteration ${iterationSlug} does not pass the coherence gate: ${owed.join(', ')} — the Archivist must fully close it out before ${taskLabel} can proceed. (row-adjacency is by design — the gate checks the preceding table row, not the Depends-on column; see D-081)`
      )
    }
  }

  // Prior-iteration archival, per project named in Project(s).
  for (const proj of input.priorIterationArchival) {
    if (proj.priorIterationSlug !== null && !proj.archived) {
      blockers.push(
        `dispatch-gate prior-iteration-archival: project \`${proj.project}\`'s previous iteration \`${proj.priorIterationSlug}\` is not archived — the Iteration Archivist must run before new work on this product.`
      )
    }
  }

  return { ready: blockers.length === 0, blockers }
}
