/**
 * The one status → count bucketing used by every Studio surface that shows
 * "how far has this tranche got": the tranche cards (via `loadTrancheProgress`
 * → `TrancheSummary.taskCounts`) and the tranche board's own header badge.
 *
 * It exists because both surfaces used to carry their own copy of the switch,
 * and the copies disagreed about the terminal-but-not-merged statuses. A
 * `dropped` task (Issue closed `NOT_PLANNED` — legitimately abandoned) fell
 * through the card's `default` into the `backlog` bucket, which the card then
 * folded into `todo`, so a fully-finished tranche with one dropped task read
 * as "17 done · 1 to do" and never reached `awaiting-archive`. The board's copy
 * dropped it on the floor instead, which left the same tranche reading Active.
 *
 * The buckets are therefore total, and every `DerivedStatus` lands in exactly
 * one of them — including the two terminal-without-merge cases, which are
 * counted under their own names rather than being absorbed into a bucket that
 * misdescribes them:
 *
 *   - `dropped` is **resolved**: no work is outstanding, but it is not `done`
 *     either — counting it as done would inflate the ledger with work that
 *     never shipped. Completion is `done + dropped === total`, computed in
 *     `deriveTrancheStatus`, not here.
 *   - `incoherent` (closed with no merged PR and no `NOT_PLANNED` reason) is
 *     **outstanding**: it is a broken close the `Closes #N` law exists to
 *     surface, so it must never count toward completion and must never be
 *     silently rendered as "to do" either.
 *
 * Pure — no I/O, no `server-only`. `DerivedStatus` is a type-only import, so
 * this module pulls no `@attalabs/aeg-core` runtime into a client bundle.
 */

import type { DerivedStatus } from '@attalabs/aeg-core'

export type TaskBuckets = {
  total: number
  /** `merged` — the work shipped. */
  done: number
  /** `in-flight` + `in-review` + `changes-requested` combined. */
  ongoing: number
  todo: number
  blocked: number
  /** `dropped` — Issue closed `NOT_PLANNED`. Resolved, but never shipped. */
  dropped: number
  /** `incoherent` — closed with no merged PR. Outstanding, and a real defect. */
  incoherent: number
  /**
   * `backlog` — project-level, never emitted for a tranche task by
   * `deriveTranche`. Counted rather than folded into `todo` so that if it ever
   * does appear, it appears as itself instead of inflating the to-do count.
   */
  backlog: number
}

/** Unreachable by construction — the argument's type is `never` when the
 *  switch above is exhaustive. Throws rather than returns, so a status that
 *  slips through at runtime is loud instead of miscounted. */
function assertNever(status: never): never {
  throw new Error(`Unhandled DerivedStatus: ${String(status)}`)
}

export function emptyTaskBuckets(total: number): TaskBuckets {
  return { total, done: 0, ongoing: 0, todo: 0, blocked: 0, dropped: 0, incoherent: 0, backlog: 0 }
}

/**
 * Bucket a tranche's derived statuses. `total` defaults to the number of
 * statuses given; callers that know the topology's own task count (which can
 * exceed the number of statuses the forge resolved) pass it explicitly.
 */
export function bucketTaskStatuses(statuses: Iterable<DerivedStatus>, total?: number): TaskBuckets {
  const counts = emptyTaskBuckets(0)
  let seen = 0
  for (const status of statuses) {
    seen++
    switch (status) {
      case 'merged':
        counts.done++
        break
      case 'in-flight':
      case 'in-review':
      case 'changes-requested':
        counts.ongoing++
        break
      case 'todo':
        counts.todo++
        break
      case 'blocked':
        counts.blocked++
        break
      case 'dropped':
        counts.dropped++
        break
      case 'incoherent':
        counts.incoherent++
        break
      case 'backlog':
        counts.backlog++
        break
      default:
        // Exhaustiveness, held by the compiler rather than by a comment: with
        // every `DerivedStatus` cased above, `status` narrows to `never` here,
        // so adding a tenth status without giving it a bucket fails typecheck.
        // A `default` that silently absorbed it is the exact mechanism this
        // module exists to remove — it is what swept `dropped` into `backlog`.
        assertNever(status)
    }
  }
  counts.total = total ?? seen
  return counts
}
