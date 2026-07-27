import { describe, expect, it } from 'vitest'
import { boardHref, NO_BOARD_REASON } from './tranche-href'

/**
 * `boardHref` is the one board-route rule, shared by three surfaces (the home
 * Tranches card, the tranches list, and the Tasks card's per-task slug).
 * These assertions pin the contract those three now depend on — in particular
 * that neither "no project" nor "an unregistered project" builds a route that
 * 404s; both resolve to a null href the surface renders as self-explaining.
 */
const REGISTERED = new Set(['vada', 'herald', 'desktop', 'vinaya'])

describe('boardHref', () => {
  it("builds the first registered project's board route", () => {
    expect(boardHref(['vada', 'desktop'], 'vada-production-v1', REGISTERED)).toBe(
      '/studio/projects/vada/tranches/vada-production-v1'
    )
  })

  it('skips a retired project name and links to the first registered one', () => {
    // `aeg` is retired (its `projects.md` row was deleted) but still
    // rides on archived Issues — link to the registered project, not the 404.
    expect(boardHref(['aeg', 'desktop'], 'deprecation-v1', REGISTERED)).toBe(
      '/studio/projects/desktop/tranches/deprecation-v1'
    )
  })

  it('returns null when every declared project is unregistered', () => {
    // The `deprecation-v1`/`aeg` case that made this fix: the only declared
    // project is retired, so there is no board route — render board-less.
    expect(boardHref(['aeg'], 'deprecation-v1', REGISTERED)).toBeNull()
  })

  it('returns null when the tranche declares no project', () => {
    // Live case at time of writing: `admin-ui-library-picker-v1`, whose one
    // Issue carries neither a `project:*` label nor a `**Project:**` field — the
    // row that must explain itself instead of dying. (A label-less tranche
    // whose field DOES resolve, e.g. `state-machine-v1` → `aeg-core`, is not
    // board-less — it is `TrancheCard`'s counter-example, not this case.)
    expect(boardHref([], 'admin-ui-library-picker-v1', REGISTERED)).toBeNull()
  })

  it('treats an empty project name as absent rather than building a broken route', () => {
    expect(boardHref([''], 'some-tranche', REGISTERED)).toBeNull()
  })
})

describe('NO_BOARD_REASON', () => {
  it('explains the absence without asserting the tranche has tasks', () => {
    // A zero-task tranche (open Milestone, no Issues cut) also has no
    // project, so the reason must not claim anything about its tasks.
    expect(NO_BOARD_REASON).not.toMatch(/task/i)
  })
})
