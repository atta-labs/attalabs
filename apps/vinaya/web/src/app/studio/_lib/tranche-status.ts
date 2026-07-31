import type { TrancheSummary } from '@/lib/repo-state'

/**
 * `archived` (the Milestone is closed) and `awaiting-archive` (every task
 * merged, Milestone still open — the normal window before the Archivist
 * runs) are deliberately distinct: the second is not an error state, it is
 * the human-in-the-loop moment the badge exists to surface.
 */
export type TrancheStatus = 'archived' | 'awaiting-archive' | 'active'

/**
 * The one place a tranche's display status is derived — both `TrancheCard`
 * and the tranche detail page call this instead of each computing their own
 * `done === total` check.
 *
 * When `forgeAvailable` is false the counts cannot be trusted (a failed forge
 * read reports as an empty/partial set, which a naive `done === total` would
 * misread as complete), so an unreadable tranche always reads as `active`,
 * never `awaiting-archive`.
 *
 * **A `dropped` task counts as resolved, not as done.** Completion is
 * `done + dropped === total`: a task whose Issue was closed `NOT_PLANNED` is
 * legitimately abandoned, so it leaves no work outstanding and must not hold
 * a finished tranche at `active` forever — but it never shipped, so it is not
 * counted as done either. `done > 0` keeps an all-dropped tranche out of
 * `awaiting-archive`: nothing was delivered, so there is nothing to archive.
 * `incoherent` is deliberately absent from the sum — a closed Issue with no
 * merged PR is a defect to resolve, never a completion.
 */
export function deriveTrancheStatus(counts: TrancheSummary['taskCounts'], archived: boolean): TrancheStatus {
  if (archived) return 'archived'
  if (!counts.forgeAvailable) return 'active'
  if (counts.done > 0 && counts.done + counts.dropped === counts.total) return 'awaiting-archive'
  return 'active'
}
