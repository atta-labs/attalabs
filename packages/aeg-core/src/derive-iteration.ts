import { deriveStatusFromModel } from './state-machine-model'
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
    const status = statuses.get(task.id) ?? 'todo'
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
 * (D-059): `blocked` wins over everything else, then `merged`, then
 * `changes-requested`, then `in-review`, then `in-flight`, then `todo` for the
 * open-issue cases (assigned or not — both are `todo` inside an iteration per
 * D-059), then the honest terminal cases for a closed-without-merge Issue.
 *
 * Reopened-after-merge exception: a reopened Issue can carry a stale
 * `prState: 'merged'` fact from a closing PR that predates the reopen —
 * `issueState` and `prState` are independently sourced, and GitHub does not
 * retract a PR's merge history just because the Issue reopened. Without this
 * check, such a task would permanently display `merged` even though the work
 * it names was never actually done. Checked before the `prState === 'merged'`
 * branch below so a currently-open Issue always wins over a historical merge.
 *
 * Honest terminal derivation (D-069): a closed Issue with no merged PR must
 * never resolve to `todo` (which would imply not-started — a lie). It reads
 * GitHub's native `stateReason`: closed `NOT_PLANNED` → `dropped` (legitimately
 * abandoned); anything else (closed `COMPLETED` or no reason recorded) →
 * `incoherent` (genuinely done but unprovable, or a broken close that the
 * `Closes #N` law was built to surface).
 *
 * A missing `forgeFacts` entry → `todo`. Iteration tasks are committed work;
 * `backlog` is a project-level concept only and is never emitted here (D-059).
 *
 * The rules themselves are no longer written here. They live as an ordered,
 * pure-data list in `state-machine-model.ts` (D-119, the `actions.ts`
 * discipline): one list, executed by this function and rendered by the docs,
 * so the two cannot drift. Each rule carries the prose and the reason its
 * position matters — change the order there, and this function's behavior
 * changes with it.
 */
function deriveStatus(facts: ForgeFacts | undefined): DerivedStatus {
  return deriveStatusFromModel(facts)
}
