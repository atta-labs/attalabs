import { describe, expect, it } from 'vitest'
import { MILESTONES } from './seed-roadmap-milestones'

// `version` is a RECORD of what shipped, never a target/prediction — every entry
// but the one already-shipped milestone omits the `version` key entirely, so
// `patch().set()` can never assert a predicted number (see the script's own
// docstring). `EXPECTED` mirrors that: no `version` key for an unshipped entry,
// matching what `MILESTONES_INPUT`'s object literal actually carries.
const EXPECTED = [
  { title: 'Milestone layer', version: '0.19.0', status: 'shipping' },
  { title: 'Determinism hardening', status: 'planned' },
  { title: 'Agentic interface', status: 'planned' },
  { title: 'Review that answers itself', status: 'planned' },
  { title: 'A task finishes itself', status: 'planned' },
  { title: 'A tranche finishes itself', status: 'planned' },
  { title: 'A milestone finishes itself', status: 'planned' }
] as const

describe('seed-roadmap-milestones MILESTONES', () => {
  it('seeds exactly the seven items, in order, matching title/version/status', () => {
    expect(MILESTONES.map((m) => ({ title: m.title, version: m.version, status: m.status }))).toEqual(EXPECTED)
  })

  it('omits the version key entirely for every unshipped entry — never a null/empty placeholder', () => {
    const unshipped = MILESTONES.filter((m) => m.title !== 'Milestone layer')
    expect(unshipped).toHaveLength(6)
    for (const m of unshipped) {
      expect(Object.hasOwn(m, 'version')).toBe(false)
    }
  })

  it('orders items 1 through 7, matching table order', () => {
    expect(MILESTONES.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('marks only the item at or below the installed @attalabs/vinaya version as shipping', () => {
    const shipping = MILESTONES.filter((m) => m.status === 'shipping')
    expect(shipping).toHaveLength(1)
    expect(shipping[0]?.title).toBe('Milestone layer')
  })

  it('never marks an item dropped', () => {
    expect(MILESTONES.some((m) => (m.status as string) === 'dropped')).toBe(false)
  })
})
