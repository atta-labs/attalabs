import type { DiagramModel, DiagramNode } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { deriveGroups } from './groupings'

const ring0Active: DiagramNode = { id: 'ring:0', kind: 'ring', label: 'Ring 0', ringIndex: 0, renderState: 'active' }
const ring1: DiagramNode = { id: 'ring:1', kind: 'ring', label: 'Ring 1', ringIndex: 1, renderState: 'active' }
const ring2: DiagramNode = { id: 'ring:2', kind: 'ring', label: 'Ring 2', ringIndex: 2, renderState: 'active' }

/**
 * "Cannot lie by omission," proven at the render layer: a fixture with two
 * `disabled` gates, turned off by different means. Both must still be present
 * in `deriveGroups`' output — neither is filtered out, dropped, or merged
 * away. A gate that is off is still a gate the reader is told about.
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
        renderState: 'disabled',
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
    iteration: null
  }

  it('keeps the disabled gate visible — present in the children array, not hidden', () => {
    const ring0 = deriveGroups(model).find((g) => g.key === 'ring0')
    const disabledGate = ring0?.children.find((n) => n.id === 'gate:pre-commit')
    expect(disabledGate).toBeDefined()
    expect(disabledGate?.renderState).toBe('disabled')
  })

  it('keeps every disabled gate visible — a gate that is off is still rendered', () => {
    const ring0 = deriveGroups(model).find((g) => g.key === 'ring0')
    const secondGate = ring0?.children.find((n) => n.id === 'gate:commit-msg')
    expect(secondGate).toBeDefined()
    expect(secondGate?.renderState).toBe('disabled')
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
