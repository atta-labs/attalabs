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
      // One of each crossing — the seam must hold both, and used to hold only
      // the first.
      {
        id: 'action:publish-the-branch',
        kind: 'action',
        label: 'publish the branch',
        renderState: 'active',
        crosses: 'into-github'
      },
      {
        id: 'action:commit-the-work',
        kind: 'action',
        label: 'commit the work',
        renderState: 'active',
        crosses: 'none'
      },
      role('developer'),
      role('reviewer'),
      contract('brief-developer')
    ],
    edges: [],
    findings: [],
    tranche: null
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

  it('the actions seam holds EVERY action, crossing or not — #508: render the real 10/9/6', () => {
    const m = baseModel([])
    const ids = deriveGroups(m)
      .find((g) => g.key === 'actions')
      ?.children.map((n) => n.id)

    // This asserted `not.toContain('action:commit-the-work')` once, and so
    // pinned the bug in place: the seam was named "GitHub Crossing" and held
    // only the 5 crossings, leaving 5 canonical actions rendered nowhere. A
    // test that encodes an omission is how an omission survives review.
    expect(ids).toContain('action:publish-the-branch') // crosses: into-github
    expect(ids).toContain('action:commit-the-work') // crosses: none
    // Count from the model, never a literal — the seam is "every action node",
    // so a fixture gaining one must not need this test edited.
    expect(ids?.length).toBe(m.nodes.filter((n) => n.kind === 'action').length)
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
      nodes: [disabledRing0, ring1, ring2, { ...gate('locked-one'), renderState: 'locked', lock: '' }],
      edges: [],
      findings: [],
      tranche: null
    }
    const groups = deriveGroups(model)
    const ring0Group = groups.find((g) => g.key === 'ring0')
    expect(ring0Group?.renderState).toBe('disabled')
    expect(ring0Group?.children[0]?.renderState).toBe('locked')
  })
})
