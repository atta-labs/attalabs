import { describe, expect, it } from 'vitest'
import { DEFAULT_BOARD_SLUG, withDefaultBoardEntry } from './default-board-slug'

/**
 * `withDefaultBoardEntry` is the one place a synthetic default-board entry
 * gets appended to a project list (`projects/page.tsx`'s cards,
 * `projects/layout.tsx`'s sub-bar). A real forge-derived project literally
 * named `DEFAULT_BOARD_SLUG` must win that slug rather than sit beside a
 * second entry with the identical `name` — a duplicate React `key`, which
 * is undefined which of the two ever renders or links correctly (#811
 * review fix). `resolveProjectView`'s routing precedence makes the same
 * call (`read-root.test.ts`'s `__resolveForgeAbsentView` suite) — the two
 * must never disagree.
 */
describe('withDefaultBoardEntry', () => {
  it('appends the default-board entry when no real project claims the slug', () => {
    const names = [{ name: 'vada' }, { name: 'herald' }]
    expect(withDefaultBoardEntry(names)).toEqual([
      { name: 'vada' },
      { name: 'herald' },
      { name: DEFAULT_BOARD_SLUG, label: 'All tranches' }
    ])
  })

  it('skips the synthetic entry when a real project already has that exact name — no duplicate key', () => {
    const names = [{ name: 'vada' }, { name: DEFAULT_BOARD_SLUG }]
    const result = withDefaultBoardEntry(names)
    expect(result).toEqual([{ name: 'vada' }, { name: DEFAULT_BOARD_SLUG }])
    expect(result.filter((n) => n.name === DEFAULT_BOARD_SLUG)).toHaveLength(1)
  })

  it('an empty list still gets the default-board entry', () => {
    expect(withDefaultBoardEntry([])).toEqual([{ name: DEFAULT_BOARD_SLUG, label: 'All tranches' }])
  })
})
