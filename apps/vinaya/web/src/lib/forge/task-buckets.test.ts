import type { DerivedStatus } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { bucketTaskStatuses, type TaskBuckets } from './task-buckets'

/**
 * The property that matters is totality: every `DerivedStatus` lands in
 * exactly one bucket, and no status is silently absorbed by a bucket that
 * misdescribes it. The bug this module exists to close was exactly that —
 * `dropped` fell through a `default` into `backlog`, which the card then
 * folded into `todo`.
 */
const ALL_STATUSES: DerivedStatus[] = [
  'backlog',
  'todo',
  'in-flight',
  'in-review',
  'changes-requested',
  'merged',
  'blocked',
  'dropped',
  'incoherent'
]

function bucketSum(counts: TaskBuckets): number {
  return (
    counts.done + counts.ongoing + counts.todo + counts.blocked + counts.dropped + counts.incoherent + counts.backlog
  )
}

describe('bucketTaskStatuses', () => {
  it('places every derived status in exactly one bucket', () => {
    const counts = bucketTaskStatuses(ALL_STATUSES)
    expect(bucketSum(counts)).toBe(ALL_STATUSES.length)
    expect(counts.total).toBe(ALL_STATUSES.length)
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
