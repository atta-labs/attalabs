import type { DerivedIteration, DerivedStatus, DerivedTask, ForgeFacts, Iteration, Task, UnknownEdge } from './types'

/**
 * Compute each task's derived status, the resolved depends-on / conflicts-with
 * graph, and dispatch-eligibility per `iterations/README.md` §3 (status table)
 * and §8 (dispatch gates).
 *
 * The function is pure: `iteration` + `forgeFacts` in, `DerivedIteration` out.
 * Edges referencing task ids not present in this iteration's table are
 * reported via `unknownEdges` rather than throwing — see §4 traps in the brief
 * (real files reference dropped/prose-only ids in narrative).
 */
export function deriveIteration(iteration: Iteration, forgeFacts: Map<string, ForgeFacts>): DerivedIteration {
  const byId = new Map<string, Task>()
  for (const task of iteration.tasks) byId.set(task.id, task)

  // First pass: derive each task's own status.
  const statuses = new Map<string, DerivedStatus>()
  for (const task of iteration.tasks) {
    statuses.set(task.id, deriveStatus(forgeFacts.get(task.id)))
  }

  // Second pass: dispatch eligibility, which references siblings' derived
  // statuses (so it must come after the first pass).
  const unknownEdges: UnknownEdge[] = []
  const derived: DerivedTask[] = []
  for (const task of iteration.tasks) {
    const status = statuses.get(task.id) ?? 'backlog'
    const dependsOnNotMerged: string[] = []
    for (const dep of task.dependsOn) {
      if (!byId.has(dep)) {
        unknownEdges.push({ from: task.id, to: dep, kind: 'depends-on' })
        continue
      }
      if (statuses.get(dep) !== 'merged') dependsOnNotMerged.push(dep)
    }
    const conflictsWithOpenOrInFlight: string[] = []
    for (const sib of task.conflictsWith) {
      if (!byId.has(sib)) {
        unknownEdges.push({ from: task.id, to: sib, kind: 'conflicts-with' })
        continue
      }
      const sibStatus = statuses.get(sib)
      if (sibStatus === 'in-flight' || sibStatus === 'in-review' || sibStatus === 'changes-requested') {
        conflictsWithOpenOrInFlight.push(sib)
      }
    }
    derived.push({
      task,
      status,
      dispatchable: dependsOnNotMerged.length === 0 && conflictsWithOpenOrInFlight.length === 0,
      blockers: { dependsOnNotMerged, conflictsWithOpenOrInFlight }
    })
  }

  return { iteration, tasks: derived, unknownEdges }
}

/**
 * Map a single task's forge facts to its derived status. Mirrors the §3 table
 * exactly: `blocked` wins over everything else, then `merged`, then
 * `changes-requested`, then `in-review`, then `in-flight`, then
 * `todo`/`backlog` from the issue facts alone.
 *
 * A missing `forgeFacts` entry → `backlog`. The brief permits "backlog/todo
 * from issue facts alone"; with no facts at all the conservative read is
 * "unknown — show as backlog until the forge tells us otherwise."
 */
function deriveStatus(facts: ForgeFacts | undefined): DerivedStatus {
  if (!facts) return 'backlog'
  if (facts.blockedLabel) return 'blocked'
  if (facts.prState === 'merged') return 'merged'
  if (facts.prState === 'open') {
    return facts.reviewDecision === 'changes_requested' ? 'changes-requested' : 'in-review'
  }
  if (facts.branchExists) return 'in-flight'
  if (facts.issueState === 'open') {
    return facts.assigned ? 'todo' : 'backlog'
  }
  // Issue closed, no PR merged — unusual (e.g. closed not-planned). Surface as
  // backlog; the row likely shouldn't be in the table anymore.
  return 'backlog'
}
