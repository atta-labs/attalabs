import { DERIVED_STATUSES, type DerivedStatus } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { bucketTaskStatuses, type TaskBuckets } from './task-buckets'

/**
 * The property that matters is totality: every `DerivedStatus` lands in
 * exactly one bucket, and no status is silently absorbed by a bucket that
 * misdescribes it. The bug this module exists to close was exactly that —
 * `dropped` fell through a `default` into `backlog`, which the card then
 * folded into `todo`.
 *
 * The status list is read from `@atta/aeg-core`'s own `DERIVED_STATUSES`
 * rather than hand-copied here (the same import `(site)/state-machine`'s
 * loader test uses), so a status added upstream reaches this suite instead of
 * quietly falling outside a local literal that still passes.
 */
const EXPECTED_BUCKET: Record<DerivedStatus, keyof TaskBuckets> = {
  merged: 'done',
  'in-flight': 'ongoing',
  'in-review': 'ongoing',
  'changes-requested': 'ongoing',
  todo: 'todo',
  blocked: 'blocked',
  dropped: 'dropped',
  incoherent: 'incoherent',
  backlog: 'backlog'
}

function bucketSum(counts: TaskBuckets): number {
  return (
    counts.done + counts.ongoing + counts.todo + counts.blocked + counts.dropped + counts.incoherent + counts.backlog
  )
}

describe('bucketTaskStatuses', () => {
  it('places every derived status in the bucket that names it', () => {
    // Asserted per status, not as a sum: the loop increments exactly one
    // counter per input, so a total-equals-length assertion holds for any
    // mapping, correct or not — it cannot fail on the miscategorisation it
    // exists to catch.
    for (const status of DERIVED_STATUSES) {
      const counts = bucketTaskStatuses([status])
      expect({ status, bucket: EXPECTED_BUCKET[status], count: counts[EXPECTED_BUCKET[status]] }).toEqual({
        status,
        bucket: EXPECTED_BUCKET[status],
        count: 1
      })
      expect(bucketSum(counts)).toBe(1)
    }
  })

  it('covers the whole status set — no status outside the expectation table', () => {
    // `EXPECTED_BUCKET` is `Record<DerivedStatus, …>`, so the compiler already
    // refuses a missing key; this catches the runtime half — a status present
    // in the model but absent from the constant the model itself publishes.
    expect(Object.keys(EXPECTED_BUCKET).sort()).toEqual([...DERIVED_STATUSES].sort())
  })

  it('accounts for every status handed to it', () => {
    const counts = bucketTaskStatuses(DERIVED_STATUSES)
    expect(bucketSum(counts)).toBe(DERIVED_STATUSES.length)
    expect(counts.total).toBe(DERIVED_STATUSES.length)
  })

  it('counts a dropped task as dropped — never as todo or backlog', () => {
    const counts = bucketTaskStatuses(['dropped', 'dropped'])
    expect(counts.dropped).toBe(2)
    expect(counts.todo).toBe(0)
    expect(counts.backlog).toBe(0)
  })

  it('counts an incoherent task as incoherent — never as done', () => {
    const counts = bucketTaskStatuses(['incoherent'])
    expect(counts.incoherent).toBe(1)
    expect(counts.done).toBe(0)
  })

  it('collapses the three in-progress statuses into ongoing', () => {
    const counts = bucketTaskStatuses(['in-flight', 'in-review', 'changes-requested'])
    expect(counts.ongoing).toBe(3)
  })

  it('honours an explicit total over the number of statuses given', () => {
    // The topology's task count is authoritative over however many tasks the
    // forge actually resolved facts for.
    const counts = bucketTaskStatuses(['merged'], 4)
    expect(counts.total).toBe(4)
    expect(counts.done).toBe(1)
  })
})
