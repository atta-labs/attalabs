/**
 * Stuck row-adjacent blocker detection (aeg-governance-hardening task 23,
 * #360, Part 3). Pure — no `fs`, no `gh`/`git` shell-outs, no `Date.now()`/
 * `new Date()` (a pure `src/` module never generates its own timestamp — see
 * `baseline-capture.ts`). The CLI shim (`bin/stale-blocker.ts`) gathers the
 * facts (topology row order, per-task Issue open/closed + opened-at, and
 * whether a `task/<iter>/<id>` branch exists on the forge for each row) and
 * passes them in, plus a caller-supplied `nowIso`.
 *
 * Exists to make the row-adjacency design (D-081 — the dispatch gate checks
 * the preceding topology row, not the `Depends-on` column; see
 * `dispatch-gate.ts`) self-diagnosing: if an early row's Issue sits open for
 * too long, every later row in that iteration is structurally stuck behind
 * it (the prior-task archival predicate blocks them all), but nothing today
 * proactively surfaces that stall — it is only discovered when a Developer
 * later hits the dispatch gate. This is a notification channel, not a gate:
 * `daily-drift` (the CI job that calls this) must never fail red (§ archivist.yml).
 */

export type StaleBlockerTaskFact = {
  id: string
  issue: number | null
  /** Only meaningful when `issue` is non-null. */
  issueOpen: boolean
  /** ISO timestamp the Issue was opened, or null when `issue` is null or state is unknown. */
  issueOpenedAt: string | null
  /** Whether a `task/<iterationSlug>/<id>` branch exists on the forge remote — "started." */
  branchExists: boolean
}

export type StaleBlockerIterationFact = {
  slug: string
  /** Topology row order — index order is significance, matching `resolvePriorTask`'s row-adjacency. */
  tasks: StaleBlockerTaskFact[]
}

export type StaleBlocker = {
  iterationSlug: string
  taskId: string
  issue: number
  daysOpen: number
  /** The first later row (by index) that has not started — the evidence the stall is real, not just old. */
  blockedTaskId: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * For every active iteration, walk its task table in row order. A task is a
 * "stuck blocker" when: (1) it has an open Issue open for more than
 * `thresholdDays`, AND (2) at least one later row in the same iteration has
 * not started (no forge branch yet). Both conditions must hold — an old open
 * Issue whose later rows have all already started is not stalling anything;
 * a fresh Issue with unstarted later rows is not yet stale.
 */
export function findStaleBlockers(
  iterations: StaleBlockerIterationFact[],
  nowIso: string,
  thresholdDays: number
): StaleBlocker[] {
  const now = new Date(nowIso).getTime()
  const blockers: StaleBlocker[] = []

  for (const iteration of iterations) {
    for (let i = 0; i < iteration.tasks.length; i++) {
      const task = iteration.tasks[i] as StaleBlockerTaskFact
      if (task.issue === null || !task.issueOpen || !task.issueOpenedAt) continue

      const daysOpen = (now - new Date(task.issueOpenedAt).getTime()) / MS_PER_DAY
      if (daysOpen <= thresholdDays) continue

      const laterUnstarted = iteration.tasks.slice(i + 1).find((t) => !t.branchExists)
      if (!laterUnstarted) continue

      blockers.push({
        iterationSlug: iteration.slug,
        taskId: task.id,
        issue: task.issue,
        daysOpen: Math.floor(daysOpen),
        blockedTaskId: laterUnstarted.id
      })
    }
  }

  return blockers
}
