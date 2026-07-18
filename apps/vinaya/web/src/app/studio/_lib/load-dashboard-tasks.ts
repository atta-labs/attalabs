/**
 * Aggregates the dashboard's Tasks card across every active iteration (task 11,
 * #571) — everything Ready to pick up, everything actively moving, and
 * everything Blocked. It reads the SAME derivation the iteration board reads —
 * `deriveIteration` (via `loadIterationSnapshot`) for the `DerivedStatus`, and
 * `checkDispatchReadiness` (via `loadDispatchReadiness`) for the `todo`
 * Ready/Blocked sub-state — and never a second status mapping of its own:
 * `status-display.ts` is the one source of the label vocabulary, and this
 * module resolves each task's badge through it here (server-side) so the client
 * panel stays presentational.
 *
 * A task's `category` is one of five, mapped from its derived status:
 *   - `ready`             — a `todo` task whose dispatch gate passes now
 *   - `blocked`           — a `todo` task whose gate FAILS (Blocked · needs #N),
 *                           OR the `blocked` DerivedStatus (an `aeg:blocked`
 *                           label — D-069's anomaly holding-pen)
 *   - `in-flight`         — branch open, no PR
 *   - `in-review`         — PR open
 *   - `changes-requested` — reviewer asked for changes
 * `merged` and the terminal anomaly states are out of scope — this is the
 * "what can I pick up / what is moving / what is stuck" window.
 *
 * Forge honesty: `loadActiveIterations` returns `[]` when the forge is
 * unreachable, so this returns `[]` too — the dashboard reads the forge status
 * separately (from `listIterations().forge`) and renders a banner instead of a
 * truth-shaped empty card (D-087).
 *
 * SERVER-ONLY.
 */

import 'server-only'
import type { BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { loadDispatchReadiness } from '@/lib/forge/dispatch-readiness'
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'
import { loadActiveIterations } from '@/lib/repo-state'
import { statusVisual, todoDispatchVisual } from '@/app/studio/projects/[name]/iterations/[slug]/_lib/status-display'

export type TaskCategory = 'ready' | 'blocked' | 'in-flight' | 'in-review' | 'changes-requested' | 'backlog'

/** A resolved status badge — pre-computed here so the client stays dumb. */
export type TaskBadge = { label: string; badgeClass: string; title?: string }

export type DashboardTask = {
  /** Iteration slug, or `null` for a backlog Issue (no iteration by definition). */
  iterationSlug: string | null
  /** Deep link to the iteration's board, or `null` (backlog / no project). */
  iterationHref: string | null
  taskId: string
  title: string
  issue: number | null
  /** Link to the task's GitHub Issue, or `null` when no issue/repo resolves. */
  issueUrl: string | null
  category: TaskCategory
  badge: TaskBadge
}

/**
 * Map the backlog Issues into the same `DashboardTask` shape so the Tasks card
 * can list them alongside iteration tasks under a `backlog` filter — one row
 * type, one badge vocabulary (`statusVisual('backlog')`). Backlog Issues carry
 * no iteration, so `iterationSlug` is `null` and no iteration renders.
 */
export function backlogToTasks(issues: BacklogIssue[]): DashboardTask[] {
  const v = statusVisual('backlog')
  return issues.map((issue) => ({
    iterationSlug: null,
    iterationHref: null,
    taskId: `backlog-${issue.number}`,
    title: issue.title,
    issue: issue.number,
    issueUrl: issue.url,
    category: 'backlog' as const,
    badge: { label: v.label, badgeClass: v.badgeClass }
  }))
}

export async function loadDashboardTasks(): Promise<DashboardTask[]> {
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
      const iterationHref = task.projects[0] ? `/studio/projects/${task.projects[0]}/iterations/${fileSlug}` : null
      const base = {
        iterationSlug: fileSlug,
        iterationHref,
        taskId: String(task.id),
        title: task.title,
        issue: task.issue,
        issueUrl
      }

      let entry: Pick<DashboardTask, 'category' | 'badge'> | null = null

      if (status === 'todo') {
        // Ready vs Blocked · needs #N — the gate's own verdict, never re-derived.
        const readiness = readinessById.get(String(task.id))
        if (readiness) {
          const v = todoDispatchVisual(readiness)
          entry = {
            category: readiness.ready ? 'ready' : 'blocked',
            badge: { label: v.label, badgeClass: v.badgeClass, title: v.title }
          }
        }
      } else if (status === 'blocked') {
        const v = statusVisual('blocked')
        entry = { category: 'blocked', badge: { label: v.label, badgeClass: v.badgeClass, title: v.description } }
      } else if (status === 'in-flight' || status === 'in-review' || status === 'changes-requested') {
        const v = statusVisual(status)
        entry = { category: status, badge: { label: v.label, badgeClass: v.badgeClass } }
      }

      if (entry) out.push({ ...base, ...entry })
    }
  }

  // Ordering is the panel's job (its `CATEGORY_ORDER` is the single source, and
  // it must order the merged iteration+backlog list anyway) — return unsorted.
  return out
}
