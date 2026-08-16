import { describe, expect, it } from 'vitest'
import { deriveTrancheStatus } from './tranche-status'

function counts(overrides: Partial<Parameters<typeof deriveTrancheStatus>[0]> = {}) {
  return {
    total: 3,
    done: 3,
    ongoing: 0,
    todo: 0,
    blocked: 0,
    dropped: 0,
    incoherent: 0,
    backlog: 0,
    forgeAvailable: true,
    ...overrides
  }
}

describe('deriveTrancheStatus', () => {
  it('reads archived unconditionally, even when counts look incomplete', () => {
    expect(deriveTrancheStatus(counts({ total: 3, done: 1 }), true)).toBe('archived')
  })

  it('reads active when the forge is unavailable, never awaiting-archive', () => {
    // The trap this derivation exists to avoid: an unreadable forge reports
    // an empty/partial count set, which a naive `done === total` would
    // misread as complete.
    expect(deriveTrancheStatus(counts({ total: 0, done: 0, forgeAvailable: false }), false)).toBe('active')
  })

  it('reads awaiting-archive when every task is done and the forge is available', () => {
    expect(deriveTrancheStatus(counts({ total: 3, done: 3 }), false)).toBe('awaiting-archive')
  })

  it('reads active when some tasks are still outstanding', () => {
    expect(deriveTrancheStatus(counts({ total: 3, done: 1, ongoing: 1, todo: 1 }), false)).toBe('active')
  })

  it('reads active for a zero-task tranche rather than awaiting-archive', () => {
    // total === 0 must not satisfy `done === total` into a false "complete".
    expect(deriveTrancheStatus(counts({ total: 0, done: 0 }), false)).toBe('active')
  })

  it('reads awaiting-archive when the only unmerged task was dropped', () => {
    // The live bug: `vinaya-pages-v2` finished 17 merged + 1 dropped and read
    // Active forever, because a dropped task can never become `done`.
    expect(deriveTrancheStatus(counts({ total: 18, done: 17, dropped: 1 }), false)).toBe('awaiting-archive')
  })

  it('does not read awaiting-archive when every task was dropped', () => {
    // Nothing was delivered — there is no completed work to archive.
    expect(deriveTrancheStatus(counts({ total: 3, done: 0, dropped: 3 }), false)).toBe('active')
  })

  it('does not count an incoherent task toward completion', () => {
    // A closed Issue with no merged PR is a defect to resolve, not a
    // completion — it must hold the tranche at active.
    expect(deriveTrancheStatus(counts({ total: 3, done: 2, incoherent: 1 }), false)).toBe('active')
  })
})
