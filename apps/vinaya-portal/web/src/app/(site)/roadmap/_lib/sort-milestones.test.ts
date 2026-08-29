import { describe, expect, it } from 'vitest'
import { sortMilestones } from './sort-milestones'

type Item = { id: string; version: string | null; order: number }

const ids = (items: Item[]) => sortMilestones(items).map((i) => i.id)

describe('sortMilestones', () => {
  it('puts every versioned milestone before every unversioned one', () => {
    const items: Item[] = [
      { id: 'planned-a', version: null, order: 1 },
      { id: 'shipped', version: '0.19.0', order: 9 },
      { id: 'planned-b', version: null, order: 2 }
    ]
    expect(ids(items)).toEqual(['shipped', 'planned-a', 'planned-b'])
  })

  it('sorts versioned milestones ascending, ignoring the manual order', () => {
    // The real regression: 0.19.3 was seeded with a higher manual `order` than
    // the unshipped rungs above it, so a shipped release rendered at the bottom.
    const items: Item[] = [
      { id: 'agentic-interface', version: '0.19.3', order: 7 },
      { id: 'milestone-layer', version: '0.19.0', order: 1 },
      { id: 'determinism', version: null, order: 2 }
    ]
    expect(ids(items)).toEqual(['milestone-layer', 'agentic-interface', 'determinism'])
  })

  it('compares versions numerically per segment, not lexically', () => {
    const items: Item[] = [
      { id: 'ten', version: '0.19.10', order: 1 },
      { id: 'three', version: '0.19.3', order: 2 }
    ]
    expect(ids(items)).toEqual(['three', 'ten'])
  })

  it('keeps unversioned milestones in their manual order', () => {
    const items: Item[] = [
      { id: 'third', version: null, order: 30 },
      { id: 'first', version: null, order: 10 },
      { id: 'second', version: null, order: 20 }
    ]
    expect(ids(items)).toEqual(['first', 'second', 'third'])
  })

  it('breaks a version tie by manual order, deterministically', () => {
    const items: Item[] = [
      { id: 'later', version: '0.19.0', order: 5 },
      { id: 'earlier', version: '0.19.0', order: 2 }
    ]
    expect(ids(items)).toEqual(['earlier', 'later'])
  })

  it('treats an empty or whitespace-only version as absent', () => {
    // `compareVersions(' ', '0.19.0')` would read the blank as 0 and pin it above
    // every real release — the CMS field is free text, so a cleared value can be
    // whitespace rather than null.
    const items: Item[] = [
      { id: 'blank', version: '   ', order: 9 },
      { id: 'empty', version: '', order: 8 },
      { id: 'real', version: '0.19.0', order: 1 }
    ]
    expect(ids(items)).toEqual(['real', 'empty', 'blank'])
  })

  it('does not mutate the input array', () => {
    const items: Item[] = [
      { id: 'b', version: '0.20.0', order: 1 },
      { id: 'a', version: '0.19.0', order: 2 }
    ]
    sortMilestones(items)
    expect(items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})
