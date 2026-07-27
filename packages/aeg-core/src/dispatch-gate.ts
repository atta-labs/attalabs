/**
 * Dispatch-readiness composition (aeg-governance-hardening task 11, #324).
 * Pure — no `fs`, no `fetch`. Composes the forge/rationale/provenance/
 * archival facts the CLI shim (`bin/verify-dispatch.ts`) gathers (reusing
 * `parseTranche`, `hasProvenance`, `taskRefFromBranch`,
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

/**
 * Removed the predicate that consumed this fact
 * (`checkDispatchReadiness` no longer blocks on it) — automated the
 * signal (per-task provenance posting) this predicate existed to protect,
 * making the row-adjacency gate itself the stale part, not the automation.
 * Kept, dormant, rather than deleted: several callers (`bin/verify-dispatch.ts`,
 * both Studio/Vinaya `map-dispatch-input.ts` mappers) still assemble this
 * fact as harmless dead plumbing, and `DispatchGateInput.priorTask` below
 * remains the exact shape needed to test the predicate's absence.
 */
export type DispatchPriorTaskFact = {
  id: string
  issue: number | null
  issueClosed: boolean
  prMerged: boolean
  hasProvenance: boolean
}

export type DispatchPriorTrancheFact = {
  project: string
  /** null when this project has no prior tranche at all — the gate passes trivially for it. */
  priorTrancheSlug: string | null
  archived: boolean
}

export type DispatchGateInput = {
  trancheSlug: string
  /** The topology row for this task, as parsed by `parseTranche`. */
  task: Task
  /** null when the task has no Issue (#TBD/blank) OR the Issue number doesn't resolve on the forge (phantom ref). */
  issue: DispatchIssueFact
  /** `checkIssueRationale` result for this task's Issue — irrelevant (treated as passing) when `issue` is null. */
  issueRationalePass: boolean
  dependsOn: DispatchDependsOnFact[]
  conflictsWith: DispatchConflictsWithFact[]
  /**
   * The immediately-prior task in this same tranche's topology, or null
   * when this is the first task. no longer read by
   * `checkDispatchReadiness` — dormant field, kept for caller compatibility.
   */
  priorTask: DispatchPriorTaskFact | null
  /** One entry per project named in `task.projects`. */
  priorTrancheArchival: DispatchPriorTrancheFact[]
}

export type DispatchResult = { ready: boolean; blockers: string[] }

export function checkDispatchReadiness(input: DispatchGateInput): DispatchResult {
  const { trancheSlug, task } = input
  const taskLabel = `task ${task.id} (tranche ${trancheSlug})`
  const blockers: string[] = []

  // Issue-existence — the topology row itself has no Issue number.
  if (task.issue === null) {
    blockers.push(
      `dispatch-gate issue-existence: ${taskLabel} has no Issue (#TBD or blank) in the topology — not dispatchable until the Planner cuts the Issue.`
    )
  } else if (input.issue === null) {
    // Row names an Issue number, but it doesn't resolve on the forge — phantom ref (T1's fail class).
    blockers.push(
      `dispatch-gate issue-existence: ${taskLabel} names Issue #${task.issue}, but it does not resolve to a real GitHub Issue (phantom reference).`
    )
  }

  // Planner-rationale completeness — only evaluable when the Issue itself resolved.
  if (input.issue !== null && !input.issueRationalePass) {
    blockers.push(
      `dispatch-gate rationale: Issue #${input.issue.number} for ${taskLabel} fails the rationale gate (checkIssueRationale) — the Planner must complete the eight-field rationale before this task is dispatchable.`
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

  // Prior-task archival / row-adjacency predicate REMOVED (2026-07-13).
  // The retired predicate required every earlier table row's full archival (Issue
  // closed, PR merged, provenance posted) regardless of whether that row was
  // a declared dependency automated the provenance-posting signal
  // this existed to protect, so the blanket row-order block outlived its
  // justification. `input.priorTask` is still accepted (dormant) for caller
  // compatibility; see the type's doc comment above.

  // Prior-tranche archival, per project named in Project(s).
  for (const proj of input.priorTrancheArchival) {
    if (proj.priorTrancheSlug !== null && !proj.archived) {
      blockers.push(
        `dispatch-gate prior-tranche-archival: project \`${proj.project}\`'s previous tranche \`${proj.priorTrancheSlug}\` is not archived — the Tranche Archivist must run before new work on this product.`
      )
    }
  }

  return { ready: blockers.length === 0, blockers }
}
