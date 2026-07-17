/**
 * Aggregates the dashboard's "Tasks (ready + in-flight)" card across every
 * active iteration (task 11, #571). It reads the SAME derivation the iteration
 * board reads — `deriveIteration` (via `loadIterationSnapshot`) for the
 * `DerivedStatus`, and `checkDispatchReadiness` (via `loadDispatchReadiness`)
 * for the `todo` Ready/Blocked sub-state — and never a second status mapping
 * of its own (`status-display.ts` is the one source of the label vocabulary;
 * this module only *selects* which derived tasks to surface).
 *
 * "Ready" = a `todo` task whose dispatch gate passes right now. "In-flight" =
 * the `in-flight` DerivedStatus (branch open, no PR). Everything else is out of
 * scope for this card — it is the "what can I pick up / what is moving" window.
 *
 * Forge honesty: `loadActiveIterations` returns `[]` when the forge is
 * unreachable, so this returns `[]` too — the dashboard reads the forge status
 * separately (from `listIterations().forge`) and renders a banner instead of a
 * truth-shaped empty card (D-087).
 *
 * SERVER-ONLY.
 */

import 'server-only'
import type { DerivedStatus, DispatchResult } from '@atta/aeg-core'
import { loadDispatchReadiness } from '@/lib/forge/dispatch-readiness'
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'
import { loadActiveIterations } from '@/lib/repo-state'

export type DashboardTask = {
  iterationSlug: string
  taskId: string
  title: string
  issue: number | null
  /** Link to the task's GitHub Issue, or `null` when no issue/repo resolves. */
  issueUrl: string | null
  status: Extract<DerivedStatus, 'todo' | 'in-flight'>
  /** Present only for a Ready (`todo`) task — its passing gate verdict. */
  readiness: DispatchResult | null
}

// In-flight (moving) before Ready (pickable) — the card walks from work in
// motion to work available.
const STATUS_RANK: Record<DashboardTask['status'], number> = { 'in-flight': 0, todo: 1 }

export async function loadReadyAndInFlightTasks(): Promise<DashboardTask[]> {
  const active = await loadActiveIterations()
  const out: DashboardTask[] = []

  for (const { fileSlug, iteration } of active) {
    const snapshot = await loadIterationSnapshot(iteration, fileSlug)
    const statusById = new Map(snapshot.derived.tasks.map((dt) => [dt.task.id, dt.status]))
    const readinessById = await loadDispatchReadiness(iteration, fileSlug, snapshot)

    for (const task of iteration.tasks) {
      const status = statusById.get(String(task.id))
      const issueUrl =
        snapshot.repo && task.issue != null
          ? `https://github.com/${snapshot.repo.owner}/${snapshot.repo.repo}/issues/${task.issue}`
          : null
      const base = {
        iterationSlug: fileSlug,
        taskId: String(task.id),
        title: task.title,
        issue: task.issue,
        issueUrl
      }

      if (status === 'in-flight') {
        out.push({ ...base, status, readiness: null })
      } else if (status === 'todo') {
        const readiness = readinessById.get(String(task.id))
        if (readiness?.ready) out.push({ ...base, status, readiness })
      }
    }
  }

  return out.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])
}
