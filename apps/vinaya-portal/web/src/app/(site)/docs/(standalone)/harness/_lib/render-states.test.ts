import type { DiagramModel, DiagramNode } from '@attalabs/aeg-core'
import { describe, expect, it } from 'vitest'
import { deriveGroups } from './groupings'

const ring0Active: DiagramNode = { id: 'ring:0', kind: 'ring', label: 'Ring 0', ringIndex: 0, renderState: 'active' }
const ring1: DiagramNode = { id: 'ring:1', kind: 'ring', label: 'Ring 1', ringIndex: 1, renderState: 'active' }
const ring2: DiagramNode = { id: 'ring:2', kind: 'ring', label: 'Ring 2', ringIndex: 2, renderState: 'active' }

/**
 * The "cannot lie by omission" rule, proven at the render layer: a fixture
 * with one `disabled` gate (config turned it off) and one `locked` gate
 * (doctrine pins a lock — config tried to disable it too, and lost, exactly
 * mirroring `deriveDiagramModel`'s own precedence: lock is checked before
 * config). Both must still be present in `deriveGroups`' output — neither
 * is filtered out, dropped, or merged away.
 */
describe('render-state fixture proof', () => {
  const model: DiagramModel = {
    nodes: [
      ring0Active,
      ring1,
      ring2,
      {
        id: 'gate:pre-commit',
        kind: 'gate',
        label: 'pre-commit',
        ringIndex: 0,
        renderState: 'disabled',
        category: 'hook'
      },
      {
        id: 'gate:commit-msg',
        kind: 'gate',
        label: 'commit-msg',
        ringIndex: 0,
        renderState: 'locked',
        lock: '',
        category: 'hook'
      }
    ],
    edges: [],
    findings: [
      {
        configKey: 'gate:commit-msg',
        reason: 'config gates["gate:commit-msg"] references no gate or check in doctrine'
      }
    ],
    tranche: null
  }

  it('keeps the disabled gate visible — present in the children array, not hidden', () => {
    const ring0 = deriveGroups(model).find((g) => g.key === 'ring0')
    const disabledGate = ring0?.children.find((n) => n.id === 'gate:pre-commit')
    expect(disabledGate).toBeDefined()
    expect(disabledGate?.renderState).toBe('disabled')
  })

  it('keeps the locked gate visible and distinct from disabled — config never overrides a lock', () => {
    const ring0 = deriveGroups(model).find((g) => g.key === 'ring0')
    const lockedGate = ring0?.children.find((n) => n.id === 'gate:commit-msg')
    expect(lockedGate).toBeDefined()
    expect(lockedGate?.renderState).toBe('locked')
    expect(lockedGate?.lock).toBe('')
  })

  it('both gates share the same ring0 group — child count is 2, not 1 or 0', () => {
    const ring0 = deriveGroups(model).find((g) => g.key === 'ring0')
    expect(ring0?.children).toHaveLength(2)
  })

  it('an unknown config.gates key surfaces as a real, non-empty finding — never silently dropped', () => {
    expect(model.findings).toHaveLength(1)
    expect(model.findings[0].reason).toContain('references no gate or check in doctrine')
  })
})
