import { describe, expect, it } from 'vitest'
import { deriveTrancheStatus } from './tranche-status'

function counts(overrides: Partial<Parameters<typeof deriveTrancheStatus>[0]> = {}) {
  return { total: 3, done: 3, ongoing: 0, todo: 0, blocked: 0, forgeAvailable: true, ...overrides }
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
})
