import { describe, expect, it } from 'vitest'
import { MILESTONES } from './seed-roadmap-milestones'

const EXPECTED = [
  { title: 'Milestone layer', version: '0.19.0', status: 'shipping' },
  { title: 'Determinism hardening', version: '0.20.0', status: 'planned' },
  { title: 'Agentic interface', version: '0.21.0', status: 'planned' },
  { title: 'Review that answers itself', version: '0.22.0', status: 'planned' },
  { title: 'A task finishes itself', version: '0.23.0', status: 'planned' },
  { title: 'A tranche finishes itself', version: '0.24.0', status: 'planned' },
  { title: 'A milestone finishes itself', version: '1.0.0', status: 'planned' }
] as const

describe('seed-roadmap-milestones MILESTONES', () => {
  it('seeds exactly the seven items, in order, matching title/version/status', () => {
    expect(MILESTONES.map((m) => ({ title: m.title, version: m.version, status: m.status }))).toEqual(EXPECTED)
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
