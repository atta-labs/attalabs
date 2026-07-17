/**
 * Aggregates the dashboard's Tasks card across every active iteration (task 11,
 * #571) — everything Ready to pick up plus everything actively moving. It reads
 * the SAME derivation the iteration board reads — `deriveIteration` (via
 * `loadIterationSnapshot`) for the `DerivedStatus`, and `checkDispatchReadiness`
 * (via `loadDispatchReadiness`) for the `todo` Ready/Blocked sub-state — and
 * never a second status mapping of its own (`status-display.ts` is the one
 * source of the label vocabulary; this module only *selects* which derived
 * tasks to surface).
 *
 * "Ready" = a `todo` task whose dispatch gate passes right now. "Active" = the
 * three moving statuses `in-flight` (branch, no PR), `in-review` (PR open), and
 * `changes-requested` (reviewer asked for changes). `todo`-but-not-ready,
 * `merged`, and the terminal anomaly states are out of scope — this is the
 * "what can I pick up / what is moving" window.
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

type ActiveStatus = 'in-flight' | 'in-review' | 'changes-requested'

export type DashboardTask = {
  iterationSlug: string
  taskId: string
  title: string
  issue: number | null
  /** Link to the task's GitHub Issue, or `null` when no issue/repo resolves. */
  issueUrl: string | null
  status: Extract<DerivedStatus, 'todo' | ActiveStatus>
  /** Present only for a Ready (`todo`) task — its passing gate verdict. */
  readiness: DispatchResult | null
}

// Moving work before pickable work — the card walks from in motion to available.
const STATUS_RANK: Record<DashboardTask['status'], number> = {
  'in-review': 0,
  'changes-requested': 1,
  'in-flight': 2,
  todo: 3
}

const ACTIVE_STATUSES: readonly ActiveStatus[] = ['in-flight', 'in-review', 'changes-requested']

function isActive(status: DerivedStatus | undefined): status is ActiveStatus {
  return status !== undefined && (ACTIVE_STATUSES as readonly string[]).includes(status)
}

export async function loadReadyAndActiveTasks(): Promise<DashboardTask[]> {
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

      if (isActive(status)) {
        out.push({ ...base, status, readiness: null })
      } else if (status === 'todo') {
        const readiness = readinessById.get(String(task.id))
        if (readiness?.ready) out.push({ ...base, status, readiness })
      }
    }
  }

  return out.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])
}
