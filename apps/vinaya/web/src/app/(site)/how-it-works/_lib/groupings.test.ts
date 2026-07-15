import type { DiagramModel, DiagramNode } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { deriveGroups } from './groupings'

const ring0: DiagramNode = {
  id: 'ring:0',
  kind: 'ring',
  label: 'Ring 0 — Prevent',
  ringIndex: 0,
  renderState: 'active'
}
const ring1: DiagramNode = { id: 'ring:1', kind: 'ring', label: 'Ring 1 — Detect', ringIndex: 1, renderState: 'active' }
const ring2: DiagramNode = { id: 'ring:2', kind: 'ring', label: 'Ring 2 — Audit', ringIndex: 2, renderState: 'active' }

function gate(id: string): DiagramNode {
  return { id: `gate:${id}`, kind: 'gate', label: id, ringIndex: 0, renderState: 'active', category: 'hook' }
}

function role(id: string): DiagramNode {
  return { id: `role:${id}`, kind: 'role', label: id, renderState: 'active', actorType: 'agent' }
}

function contract(id: string): DiagramNode {
  return { id: `contract:${id}`, kind: 'contract', label: id, renderState: 'active' }
}

function baseModel(gateIds: string[]): DiagramModel {
  return {
    nodes: [
      ring0,
      ring1,
      ring2,
      ...gateIds.map(gate),
      { id: 'action:publish-the-branch', kind: 'action', label: 'publish the branch', renderState: 'active' },
      { id: 'action:commit-the-work', kind: 'action', label: 'commit the work', renderState: 'active' },
      role('developer'),
      role('reviewer'),
      contract('brief-developer')
    ],
    edges: [],
    findings: [],
    iteration: null
  }
}

describe('deriveGroups', () => {
  it('drops the ring0 child count by one when a gate row is removed from the fixture — no page-code change', () => {
    const before = deriveGroups(baseModel(['pre-commit', 'commit-msg', 'branch-topology']))
    const after = deriveGroups(baseModel(['pre-commit', 'commit-msg']))

    const ring0Before = before.find((g) => g.key === 'ring0')
    const ring0After = after.find((g) => g.key === 'ring0')

    expect(ring0Before?.children.length).toBe(3)
    expect(ring0After?.children.length).toBe(2)
    expect((ring0After?.children.length ?? 0) - (ring0Before?.children.length ?? 0)).toBe(-1)
  })

  it('the actions seam holds only into-github actions, using ACTIONS.crosses, not a hardcoded list', () => {
    const groups = deriveGroups(baseModel([]))
    const actionsSeam = groups.find((g) => g.key === 'actions')

    expect(actionsSeam?.children.map((n) => n.id)).toContain('action:publish-the-branch')
    expect(actionsSeam?.children.map((n) => n.id)).not.toContain('action:commit-the-work')
  })

  it('never hardcodes the actor count — reflects however many role nodes the model has', () => {
    const groups = deriveGroups(baseModel([]))
    const actors = groups.find((g) => g.key === 'actors')
    expect(actors?.children.length).toBe(2)
  })

  it('the contracts seam holds every real contract node — a first-class, drillable group', () => {
    const groups = deriveGroups(baseModel([]))
    const contracts = groups.find((g) => g.key === 'contracts')
    expect(contracts?.children.map((n) => n.id)).toEqual(['contract:brief-developer'])
  })

  it('returns exactly the 6 canonical groups, in a fixed outer-to-inner order', () => {
    const groups = deriveGroups(baseModel([]))
    expect(groups.map((g) => g.key)).toEqual(['actors', 'contracts', 'ring0', 'actions', 'ring1', 'ring2'])
  })

  it('surfaces a disabled ring0 render-state onto the group, never overridden by a locked gate', () => {
    const disabledRing0: DiagramNode = { ...ring0, renderState: 'disabled' }
    const model: DiagramModel = {
      nodes: [disabledRing0, ring1, ring2, { ...gate('locked-one'), renderState: 'locked', lock: 'D-999' }],
      edges: [],
      findings: [],
      iteration: null
    }
    const groups = deriveGroups(model)
    const ring0Group = groups.find((g) => g.key === 'ring0')
    expect(ring0Group?.renderState).toBe('disabled')
    expect(ring0Group?.children[0]?.renderState).toBe('locked')
  })
})
