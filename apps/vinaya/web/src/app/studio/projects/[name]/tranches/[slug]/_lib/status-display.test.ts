import { describe, expect, it } from 'vitest'
import { extractBlockerRefs, todoDispatchVisual } from './status-display'

describe('extractBlockerRefs', () => {
  it('extracts unique #N refs in blocker order, verbatim', () => {
    expect(
      extractBlockerRefs([
        'dispatch-gate depends-on: task 28 depends on 27 (#370), whose PR is not merged yet',
        'dispatch-gate prior-tranche-archival: project `aeg` previous tranche (#370) is not archived',
        'dispatch-gate conflicts-with: task 28 conflicts with 25 (#365), whose PR is open'
      ])
    ).toEqual(['#370', '#365'])
  })

  it('returns empty for blockers carrying no issue refs', () => {
    expect(extractBlockerRefs(['dispatch-gate issue-existence: task 9 has no Issue (#TBD or blank)'])).toEqual([])
  })
})

describe('todoDispatchVisual', () => {
  it('renders Ready for a passing gate', () => {
    const v = todoDispatchVisual({ ready: true, blockers: [] })
    expect(v.label).toBe('Ready')
    expect(v.badgeClass).toContain('success')
  })

  it('renders Blocked · needs #N with the full blockers as hover title', () => {
    const blockers = ['dispatch-gate depends-on: task 29 depends on 28 (#372), whose PR is not merged yet']
    const v = todoDispatchVisual({ ready: false, blockers })
    expect(v.label).toBe('Blocked · needs #372')
    expect(v.title).toBe(blockers[0])
    expect(v.badgeClass).toContain('destructive')
  })

  it('falls back to plain Blocked when no ref is extractable', () => {
    const v = todoDispatchVisual({ ready: false, blockers: ['rationale gate failed'] })
    expect(v.label).toBe('Blocked')
  })
})
