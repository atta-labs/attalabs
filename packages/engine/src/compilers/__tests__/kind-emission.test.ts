import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { loadSpec } from '../../spec-loader'
import { compileSpec } from '../spec'
import type { PlanNodeKind } from '../../types'

// Catalog YAMLs live at apps/vada-ai/yamls/
// From __tests__: up 5 levels (compilers/src/engine/packages/worktree-root) then apps/vada-ai/yamls
const YAMLS_DIR = join(import.meta.dirname, '../../../../../apps/vada-ai/yamls')

function loadCatalogSpec(id: string) {
  const yaml = readFileSync(join(YAMLS_DIR, `${id}.yaml`), 'utf-8')
  const spec = loadSpec(yaml)
  return compileSpec(spec, 'Test question')
}

const CATALOG_IDS = [
  'a0-baseline',
  'a1-baseline',
  'brokered-trio',
  'brokered-quartet',
  'sparring',
  'crucible',
  'war-room',
  'vada-reviewers',
  'vada-reviewers-synthesis'
]

const VALID_KINDS: Set<PlanNodeKind> = new Set([
  'solo-agent',
  'parallel-peer',
  'synthesizer',
  'auditor',
  'custom-step',
  'revision-terminal',
  'system-sentinel'
])

describe('kind emission — every node in every catalog YAML', () => {
  for (const id of CATALOG_IDS) {
    it(`${id}: every node has a valid kind`, () => {
      const plan = loadCatalogSpec(id)
      const nodes = Object.values(plan.graph.nodes)
      expect(nodes.length).toBeGreaterThan(0)
      for (const node of nodes) {
        expect(node.kind, `node ${node.id} is missing kind`).toBeDefined()
        expect(VALID_KINDS.has(node.kind), `node ${node.id} has invalid kind '${node.kind}'`).toBe(true)
      }
    })

    it(`${id}: no node has metadata.isRevision`, () => {
      const plan = loadCatalogSpec(id)
      const nodes = Object.values(plan.graph.nodes)
      for (const node of nodes) {
        expect('isRevision' in node.metadata, `node ${node.id} still has isRevision in metadata`).toBe(false)
      }
    })
  }
})

describe('kind emission — solo workflows', () => {
  it('a0-baseline: solo node has kind solo-agent', () => {
    const plan = loadCatalogSpec('a0-baseline')
    const nodes = Object.values(plan.graph.nodes)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.kind).toBe('solo-agent')
  })

  it('a1-baseline: solo node has kind solo-agent', () => {
    const plan = loadCatalogSpec('a1-baseline')
    const nodes = Object.values(plan.graph.nodes)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.kind).toBe('solo-agent')
  })
})

describe('kind emission — brokered workflows', () => {
  it('brokered-trio: all reviewer nodes are parallel-peer', () => {
    const plan = loadCatalogSpec('brokered-trio')
    const reviewers = Object.values(plan.graph.nodes).filter((n) => n.id.startsWith('reviewer-'))
    expect(reviewers.length).toBeGreaterThanOrEqual(2)
    for (const n of reviewers) {
      expect(n.kind).toBe('parallel-peer')
    }
  })

  it('brokered-trio: no synthesizer (no synthesis field)', () => {
    const plan = loadCatalogSpec('brokered-trio')
    const synthesizers = Object.values(plan.graph.nodes).filter((n) => n.kind === 'synthesizer')
    expect(synthesizers).toHaveLength(0)
  })

  it('brokered-quartet: all reviewer nodes are parallel-peer', () => {
    const plan = loadCatalogSpec('brokered-quartet')
    const reviewers = Object.values(plan.graph.nodes).filter((n) => n.id.startsWith('reviewer-'))
    expect(reviewers.length).toBeGreaterThanOrEqual(2)
    for (const n of reviewers) {
      expect(n.kind).toBe('parallel-peer')
    }
  })

  it('vada-reviewers: all reviewer nodes are parallel-peer', () => {
    const plan = loadCatalogSpec('vada-reviewers')
    const reviewers = Object.values(plan.graph.nodes).filter((n) => n.id.startsWith('reviewer-'))
    expect(reviewers.length).toBeGreaterThanOrEqual(2)
    for (const n of reviewers) {
      expect(n.kind).toBe('parallel-peer')
    }
  })

  it('vada-reviewers: no synthesizer node (concatenate mode)', () => {
    const plan = loadCatalogSpec('vada-reviewers')
    const synthesizers = Object.values(plan.graph.nodes).filter((n) => n.kind === 'synthesizer')
    expect(synthesizers).toHaveLength(0)
  })

  it('vada-reviewers-synthesis: has exactly one synthesizer node', () => {
    const plan = loadCatalogSpec('vada-reviewers-synthesis')
    const synthesizers = Object.values(plan.graph.nodes).filter((n) => n.kind === 'synthesizer')
    expect(synthesizers).toHaveLength(1)
    expect(synthesizers[0]!.id).toBe('brokered-synthesis')
  })
})

describe('kind emission — rounds workflows', () => {
  for (const id of ['sparring', 'crucible', 'war-room']) {
    it(`${id}: round agent nodes are parallel-peer with roundIndex set`, () => {
      const plan = loadCatalogSpec(id)
      const roundNodes = Object.values(plan.graph.nodes).filter((n) => n.role === 'round')
      expect(roundNodes.length).toBeGreaterThan(0)
      for (const n of roundNodes) {
        expect(n.kind).toBe('parallel-peer')
        expect(n.metadata.roundIndex).toBeDefined()
      }
    })

    it(`${id}: terminal-0 is synthesizer`, () => {
      const plan = loadCatalogSpec(id)
      const t0 = plan.graph.nodes['terminal-0']
      expect(t0).toBeDefined()
      expect(t0!.kind).toBe('synthesizer')
    })

    it(`${id}: terminal-1+ are revision-terminal`, () => {
      const plan = loadCatalogSpec(id)
      const revisionTerminals = Object.values(plan.graph.nodes).filter(
        (n) => n.id.startsWith('terminal-') && n.id !== 'terminal-0'
      )
      for (const n of revisionTerminals) {
        expect(n.kind).toBe('revision-terminal')
      }
    })

    it(`${id}: audit nodes are auditor`, () => {
      const plan = loadCatalogSpec(id)
      const auditNodes = Object.values(plan.graph.nodes).filter((n) => n.role === 'audit')
      expect(auditNodes.length).toBeGreaterThan(0)
      for (const n of auditNodes) {
        expect(n.kind).toBe('auditor')
      }
    })

    it(`${id}: __END__ is system-sentinel`, () => {
      const plan = loadCatalogSpec(id)
      const sentinel = plan.graph.nodes.__END__
      expect(sentinel).toBeDefined()
      expect(sentinel!.kind).toBe('system-sentinel')
    })
  }
})

describe('kind emission — edge kinds', () => {
  it('sparring: round-agent sequential edges are ordering', () => {
    const plan = loadCatalogSpec('sparring')
    const orderingEdges = plan.graph.edges.filter((e) => e.kind === 'ordering')
    expect(orderingEdges.length).toBeGreaterThan(0)
  })

  it('sparring: last-round-to-terminal-0 edge is flow', () => {
    const plan = loadCatalogSpec('sparring')
    const flowToTerminal = plan.graph.edges.find((e) => e.to === 'terminal-0' && e.kind === 'flow')
    expect(flowToTerminal).toBeDefined()
  })

  it('brokered-trio: reviewer sequential edges are ordering', () => {
    const plan = loadCatalogSpec('brokered-trio')
    const orderingEdges = plan.graph.edges.filter((e) => e.kind === 'ordering')
    expect(orderingEdges.length).toBeGreaterThan(0)
  })

  it('vada-reviewers-synthesis: edge to brokered-synthesis is flow', () => {
    const plan = loadCatalogSpec('vada-reviewers-synthesis')
    const synthEdge = plan.graph.edges.find((e) => e.to === 'brokered-synthesis')
    expect(synthEdge).toBeDefined()
    expect(synthEdge!.kind).toBe('flow')
  })
})
