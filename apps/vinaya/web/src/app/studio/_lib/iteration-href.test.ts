import { describe, expect, it } from 'vitest'
import { boardHref, NO_BOARD_REASON } from './iteration-href'

/**
 * `boardHref` is the one board-route rule, shared by three surfaces (the home
 * Iterations card, the iterations list, and the Tasks card's per-task slug).
 * These assertions pin the contract those three now depend on — in particular
 * that "no project" is a null href rather than a malformed route.
 */
describe('boardHref', () => {
  it("builds the first project's board route", () => {
    expect(boardHref(['aeg', 'desktop'], 'deprecation-v1')).toBe('/studio/projects/aeg/iterations/deprecation-v1')
  })

  it('returns null when the iteration declares no project', () => {
    // Live case at time of writing: `state-machine-v1`, whose Issues carry no
    // `project:*` label — the row that must explain itself instead of dying.
    expect(boardHref([], 'state-machine-v1')).toBeNull()
  })

  it('treats an empty project name as absent rather than building a broken route', () => {
    expect(boardHref([''], 'some-iteration')).toBeNull()
  })
})

describe('NO_BOARD_REASON', () => {
  it('explains the absence without asserting the iteration has tasks', () => {
    // A zero-task iteration (open Milestone, no Issues cut) also has no
    // project, so the reason must not claim anything about its tasks.
    expect(NO_BOARD_REASON).not.toMatch(/task/i)
  })
})
