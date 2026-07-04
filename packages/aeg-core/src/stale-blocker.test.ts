import { describe, expect, it } from 'vitest'
import { findStaleBlockers, type StaleBlockerIterationFact } from './stale-blocker'

const NOW = '2026-07-04T00:00:00.000Z'
const THRESHOLD = 4

function daysAgo(days: number): string {
  return new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('findStaleBlockers', () => {
  it('flags a stuck predecessor: old open Issue + a later unstarted row', () => {
    const iterations: StaleBlockerIterationFact[] = [
      {
        slug: 'aeg-example',
        tasks: [
          { id: '1', issue: 100, issueOpen: true, issueOpenedAt: daysAgo(10), branchExists: true },
          { id: '2', issue: 101, issueOpen: false, issueOpenedAt: null, branchExists: false }
        ]
      }
    ]

    expect(findStaleBlockers(iterations, NOW, THRESHOLD)).toEqual([
      { iterationSlug: 'aeg-example', taskId: '1', issue: 100, daysOpen: 10, blockedTaskId: '2' }
    ])
  })

  it('does not flag a fresh Issue (open, but under the threshold)', () => {
    const iterations: StaleBlockerIterationFact[] = [
      {
        slug: 'aeg-example',
        tasks: [
          { id: '1', issue: 100, issueOpen: true, issueOpenedAt: daysAgo(1), branchExists: true },
          { id: '2', issue: 101, issueOpen: false, issueOpenedAt: null, branchExists: false }
        ]
      }
    ]

    expect(findStaleBlockers(iterations, NOW, THRESHOLD)).toEqual([])
  })

  it('does not flag an iteration with no later undispatched rows', () => {
    const iterations: StaleBlockerIterationFact[] = [
      {
        slug: 'aeg-example',
        tasks: [
          { id: '1', issue: 100, issueOpen: true, issueOpenedAt: daysAgo(10), branchExists: true },
          { id: '2', issue: 101, issueOpen: true, issueOpenedAt: daysAgo(1), branchExists: true }
        ]
      }
    ]

    expect(findStaleBlockers(iterations, NOW, THRESHOLD)).toEqual([])
  })

  it('does not flag a task whose Issue is already closed', () => {
    const iterations: StaleBlockerIterationFact[] = [
      {
        slug: 'aeg-example',
        tasks: [
          { id: '1', issue: 100, issueOpen: false, issueOpenedAt: daysAgo(10), branchExists: true },
          { id: '2', issue: 101, issueOpen: false, issueOpenedAt: null, branchExists: false }
        ]
      }
    ]

    expect(findStaleBlockers(iterations, NOW, THRESHOLD)).toEqual([])
  })

  it('does not flag a task with no Issue at all (#TBD/blank row)', () => {
    const iterations: StaleBlockerIterationFact[] = [
      {
        slug: 'aeg-example',
        tasks: [
          { id: '1', issue: null, issueOpen: false, issueOpenedAt: null, branchExists: false },
          { id: '2', issue: 101, issueOpen: false, issueOpenedAt: null, branchExists: false }
        ]
      }
    ]

    expect(findStaleBlockers(iterations, NOW, THRESHOLD)).toEqual([])
  })

  it('flags each iteration independently and reports the first later-unstarted row', () => {
    const iterations: StaleBlockerIterationFact[] = [
      {
        slug: 'iter-a',
        tasks: [
          { id: '1', issue: 100, issueOpen: true, issueOpenedAt: daysAgo(20), branchExists: true },
          { id: '2', issue: 101, issueOpen: false, issueOpenedAt: null, branchExists: true },
          { id: '3', issue: 102, issueOpen: false, issueOpenedAt: null, branchExists: false }
        ]
      },
      {
        slug: 'iter-b',
        tasks: [{ id: '1', issue: 200, issueOpen: true, issueOpenedAt: daysAgo(1), branchExists: true }]
      }
    ]

    expect(findStaleBlockers(iterations, NOW, THRESHOLD)).toEqual([
      { iterationSlug: 'iter-a', taskId: '1', issue: 100, daysOpen: 20, blockedTaskId: '3' }
    ])
  })
})
