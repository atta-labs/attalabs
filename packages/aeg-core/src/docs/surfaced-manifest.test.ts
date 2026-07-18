import { describe, expect, it } from 'vitest'
import type { DiagramModel, DiagramNode } from '../diagram-model'
import { isSurfacedDoc, modelBackedDocPaths, surfacedDocs } from './surfaced-manifest'

function node(kind: DiagramNode['kind'], label: string): DiagramNode {
  return { id: `${kind}:${label}`, kind, label, renderState: 'active' }
}

/**
 * A stand-in model shaped like the real one: gate/check nodes back
 * `enforcement.md`, role nodes back `roles/<id>.md`, contract nodes back
 * `contracts/<id>.md`, and action/ring nodes back nothing. `modelBackedDocPaths`
 * turns this into the surfaced allowlist.
 */
const MODEL: DiagramModel = {
  nodes: [
    node('ring', 'Ring 0'),
    node('gate', 'Merging'),
    node('check', 'verify-docs'),
    node('action', 'open-a-pull-request'),
    node('role', 'developer'),
    node('role', 'reviewer'),
    node('contract', 'brief-developer'),
    node('contract', 'planner-brief')
  ],
  edges: [],
  findings: [],
  iteration: null
}

const SURFACED = modelBackedDocPaths(MODEL)

describe('modelBackedDocPaths: the node → doc allowlist', () => {
  it('maps gate/check nodes to enforcement.md, role/contract nodes to their own file', () => {
    expect([...SURFACED].sort()).toEqual([
      'contracts/brief-developer.md',
      'contracts/planner-brief.md',
      'enforcement.md',
      'roles/developer.md',
      'roles/reviewer.md'
    ])
  })

  it('backs no doc for action or ring nodes', () => {
    const onlyActionsAndRings = modelBackedDocPaths({
      nodes: [node('action', 'commit-the-work'), node('ring', 'Ring 1')],
      edges: [],
      findings: [],
      iteration: null
    })
    expect(onlyActionsAndRings.size).toBe(0)
  })

  it('collapses every gate/check to the single enforcement.md, not one file per row', () => {
    const many = modelBackedDocPaths({
      nodes: [node('gate', 'a'), node('gate', 'b'), node('check', 'c'), node('check', 'd')],
      edges: [],
      findings: [],
      iteration: null
    })
    expect([...many]).toEqual(['enforcement.md'])
  })
})

describe('isSurfacedDoc: model-backed rule', () => {
  it('surfaces a doc a node points at', () => {
    expect(isSurfacedDoc('enforcement.md', {}, SURFACED)).toBe(true)
    expect(isSurfacedDoc('roles/developer.md', {}, SURFACED)).toBe(true)
    expect(isSurfacedDoc('contracts/brief-developer.md', {}, SURFACED)).toBe(true)
  })

  it('does NOT surface a doc no node points at — the ~60% that backs nothing reachable', () => {
    for (const relPath of [
      'state-machine.md',
      'coordination.md',
      'process.md',
      'aeg-manual-flow.md',
      'reviewer-prompt.md',
      'documentation-coherence.md',
      'iterations/README.md',
      'diagrams/system-architecture.md',
      'skills/aeg/SKILL.md',
      'templates/brief-template.md'
    ]) {
      expect(isSurfacedDoc(relPath, {}, SURFACED)).toBe(false)
    }
  })

  it('surfaces nothing (except a frontmatter override) when no model set is supplied', () => {
    expect(isSurfacedDoc('roles/developer.md', {})).toBe(false)
    expect(isSurfacedDoc('roles/developer.md', { surfaced: true })).toBe(true)
  })
})

describe('isSurfacedDoc: frontmatter override wins both ways', () => {
  it('surfaced: false hides a doc a node points at', () => {
    expect(isSurfacedDoc('roles/developer.md', { surfaced: false }, SURFACED)).toBe(false)
  })

  it('surfaced: true shows a doc no node points at', () => {
    expect(isSurfacedDoc('coordination.md', { surfaced: true }, SURFACED)).toBe(true)
    expect(isSurfacedDoc('iterations/aeg-consolidation.md', { surfaced: true }, SURFACED)).toBe(true)
  })
})

describe('surfacedDocs', () => {
  it('filters a list of entries down to the model-backed subset', () => {
    const entries = [
      { relPath: 'enforcement.md', frontmatter: {} },
      { relPath: 'roles/developer.md', frontmatter: {} },
      { relPath: 'state-machine.md', frontmatter: {} },
      { relPath: 'coordination.md', frontmatter: { surfaced: true } },
      { relPath: 'roles/reviewer.md', frontmatter: { surfaced: false } }
    ]
    expect(surfacedDocs(entries, SURFACED)).toEqual(['enforcement.md', 'roles/developer.md', 'coordination.md'])
  })
})
