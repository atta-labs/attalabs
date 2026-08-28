import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { loadFlow, compileFlow, type Plan } from '@atta/engine'
import { planToVisualNodes } from './planToVisualNodes'

// Catalog YAMLs live at packages/agents/vada-deliberation/yamls/
// From engine-flow/: up 3 levels to repo root, then packages/agents/vada-deliberation/yamls
const YAMLS_DIR = join(import.meta.dirname, '../../../packages/agents/vada-deliberation/yamls')

function visualize(id: string) {
  const yaml = readFileSync(join(YAMLS_DIR, `${id}.yaml`), 'utf-8')
  const flow = loadFlow(yaml)
  const plan = compileFlow(flow, 'Test question')
  return planToVisualNodes(plan)
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

describe('planToVisualNodes — all catalog YAMLs', () => {
  for (const id of CATALOG_IDS) {
    it(`${id}: no system-sentinel or revision-terminal nodes rendered`, () => {
      const { nodes } = visualize(id)
      for (const n of nodes) {
        // __brief__ is the virtual entry node — not a plan node, always present
        if (n.id === '__brief__') continue
        expect(n.id, `sentinel leaked: ${n.id}`).not.toBe('__END__')
        expect(n.id, `revision-terminal leaked: ${n.id}`).not.toMatch(/^terminal-[1-9]/)
      }
    })

    it(`${id}: all rendered nodes have a React Flow type`, () => {
      const { nodes } = visualize(id)
      for (const n of nodes) {
        expect(n.type, `node ${n.id} has no type`).toBeDefined()
      }
    })
  }
})

describe('planToVisualNodes — solo workflows', () => {
  it('a0-baseline: one agent node + brief', () => {
    const { nodes, workflowType } = visualize('a0-baseline')
    expect(workflowType).toBe('solo')
    expect(nodes).toHaveLength(2) // brief + solo agent
    const agentNode = nodes.find((n) => n.id !== '__brief__')
    expect(agentNode?.type).toBe('agentNode')
  })

  it('a1-baseline: one agent node + brief', () => {
    const { nodes, workflowType } = visualize('a1-baseline')
    expect(workflowType).toBe('solo')
    expect(nodes).toHaveLength(2)
  })
})

describe('planToVisualNodes — brokered workflows', () => {
  it('brokered-trio: 3 parallel agent nodes, no synthesizer', () => {
    const { nodes, workflowType, hasSynthesis } = visualize('brokered-trio')
    expect(workflowType).toBe('brokered')
    const reviewers = nodes.filter((n) => n.id.startsWith('reviewer-'))
    expect(reviewers).toHaveLength(3)
    expect(reviewers.every((n) => n.type === 'agentNode')).toBe(true)
    expect(hasSynthesis).toBe(false)
  })

  it('brokered-quartet: 4 parallel agent nodes, no synthesizer', () => {
    const { nodes, workflowType } = visualize('brokered-quartet')
    expect(workflowType).toBe('brokered')
    const reviewers = nodes.filter((n) => n.id.startsWith('reviewer-'))
    expect(reviewers).toHaveLength(4)
  })

  it('vada-reviewers: parallel agent nodes, no synthesizer', () => {
    const { nodes, workflowType, hasSynthesis } = visualize('vada-reviewers')
    expect(workflowType).toBe('brokered')
    const reviewers = nodes.filter((n) => n.id.startsWith('reviewer-'))
    expect(reviewers.length).toBeGreaterThanOrEqual(2)
    expect(hasSynthesis).toBe(false)
  })

  it('vada-reviewers-synthesis: parallel agent nodes + synthesis node', () => {
    const { nodes, workflowType, hasSynthesis } = visualize('vada-reviewers-synthesis')
    expect(workflowType).toBe('brokered')
    const synthNodes = nodes.filter((n) => n.type === 'synthesisNode')
    expect(synthNodes).toHaveLength(1)
    expect(synthNodes[0]!.id).toBe('brokered-synthesis')
    expect(hasSynthesis).toBe(true)
  })

  it('brokered: brief → each reviewer edge exists', () => {
    const { nodes, edges } = visualize('brokered-trio')
    const reviewers = nodes.filter((n) => n.id.startsWith('reviewer-'))
    for (const reviewer of reviewers) {
      const edge = edges.find((e) => e.source === '__brief__' && e.target === reviewer.id)
      expect(edge, `missing brief→${reviewer.id} edge`).toBeDefined()
    }
  })
})

describe('planToVisualNodes — rounds workflows', () => {
  it('sparring: correct round count and agent nodes per round', () => {
    const { rounds, workflowType } = visualize('sparring')
    expect(workflowType).toBe('rounds')
    expect(rounds).toHaveLength(3) // sparring has 3 rounds
    for (const round of rounds) {
      expect(round.agentNodeIds).toHaveLength(2) // 2 agents per round
    }
  })

  it('sparring: exactly one synthesizer in post-rounds block', () => {
    const { rounds, nodes } = visualize('sparring')
    const lastRound = rounds[rounds.length - 1]!
    expect(lastRound.synthNodeId).toBeDefined()
    const synthNode = nodes.find((n) => n.id === lastRound.synthNodeId)
    expect(synthNode?.type).toBe('synthesisNode')
  })

  it('sparring: audit nodes deduplicated (slot 0 only)', () => {
    const { rounds, nodes } = visualize('sparring')
    const lastRound = rounds[rounds.length - 1]!
    // sparring has 2 auditors (BlindCritic, FactChecker)
    expect(lastRound.auditNodeIds).toHaveLength(2)
    for (const auditId of lastRound.auditNodeIds) {
      const auditNode = nodes.find((n) => n.id === auditId)
      expect(auditNode?.type).toBe('auditNode')
    }
  })

  it('sparring: no per-round synthesizer (synth only in last round)', () => {
    const { rounds } = visualize('sparring')
    for (let i = 0; i < rounds.length - 1; i++) {
      expect(rounds[i]!.synthNodeId, `round ${i} should not have synthNodeId`).toBeUndefined()
      expect(rounds[i]!.auditNodeIds).toHaveLength(0)
    }
  })

  it('crucible: 4 agents per round across 3 rounds', () => {
    const { rounds, workflowType } = visualize('crucible')
    expect(workflowType).toBe('rounds')
    expect(rounds).toHaveLength(3)
    for (const round of rounds) {
      expect(round.agentNodeIds).toHaveLength(4)
    }
  })

  it('war-room: 6 agents per round', () => {
    const { rounds } = visualize('war-room')
    for (const round of rounds) {
      expect(round.agentNodeIds).toHaveLength(6)
    }
  })

  it('rounds: brief connects to all round-0 agents', () => {
    const { rounds, edges } = visualize('sparring')
    const round0Agents = rounds[0]!.agentNodeIds
    for (const agentId of round0Agents) {
      const edge = edges.find((e) => e.source === '__brief__' && e.target === agentId)
      expect(edge, `missing brief→${agentId} edge`).toBeDefined()
    }
  })

  it('rounds: cross-round edge connects last-agent-of-R to first-agent-of-R+1', () => {
    // Implementation emits a single representative edge per round transition (last→first)
    // to avoid visual noise from all-to-all fan-out.
    const { rounds, edges } = visualize('sparring')
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const currentRound = rounds[ri]!
      const nextRound = rounds[ri + 1]!
      const lastAgent = currentRound.agentNodeIds[currentRound.agentNodeIds.length - 1]!
      const firstOfNext = nextRound.agentNodeIds[0]!
      const edge = edges.find((e) => e.source === lastAgent && e.target === firstOfNext)
      expect(edge, `missing cross-round edge ${lastAgent}→${firstOfNext}`).toBeDefined()
    }
  })
})

// loadStepsFlow is not part of @atta/engine's public surface (see flow-loader.ts) — this
// literal Plan mirrors compileFlow's compileSteps() output for the same fixture
// packages/engine/src/compile-flow.test.ts uses (MINIMAL_STEPS_YAML), so the fixture and
// the compiler's real output shape stay in lockstep.
const STEPS_PLAN: Plan = {
  schemaVersion: '1.0',
  question: 'Test question',
  model: 'claude-sonnet-4-6',
  agents: {},
  teamName: 'test-steps',
  graph: {
    nodes: {
      review: {
        id: 'review',
        role: 'agent-spawn',
        kind: 'agent-spawn',
        promptTemplate: 'Review {{target}}.',
        agentRole: 'reviewer',
        permission: 'read-only',
        workingDirectory: '{{worktree}}',
        maxTurns: 20,
        metadata: {}
      },
      'apply-patch': {
        id: 'apply-patch',
        role: 'mechanical',
        kind: 'mechanical',
        action: 'git-apply',
        metadata: {}
      }
    },
    edges: [{ from: 'review', to: 'apply-patch', kind: 'flow' }],
    conditionalEdges: [],
    entryNode: 'review'
  },
  maxRevisions: 0
}

describe('planToVisualNodes — steps-shaped Flow (agent-spawn / mechanical)', () => {
  it('workflowType is custom — never falls through to solo', () => {
    const { workflowType } = planToVisualNodes(STEPS_PLAN)
    expect(workflowType).toBe('custom')
  })

  it('renders brief + one node per step, no filtering', () => {
    const { nodes } = planToVisualNodes(STEPS_PLAN)
    expect(nodes).toHaveLength(3) // brief + review + apply-patch
  })

  it('AgentStep node renders as agentSpawnNode carrying its own fields', () => {
    const { nodes } = planToVisualNodes(STEPS_PLAN)
    const n = nodes.find((node) => node.id === 'review')
    expect(n?.type).toBe('agentSpawnNode')
    expect(n?.data).toMatchObject({
      label: 'review',
      agentRole: 'reviewer',
      permission: 'read-only',
      workingDirectory: '{{worktree}}',
      maxTurns: 20,
      visualState: 'idle'
    })
  })

  it('MechanicalStep node renders as mechanicalNode carrying its action', () => {
    const { nodes } = planToVisualNodes(STEPS_PLAN)
    const n = nodes.find((node) => node.id === 'apply-patch')
    expect(n?.type).toBe('mechanicalNode')
    expect(n?.data).toMatchObject({ label: 'apply-patch', action: 'git-apply', visualState: 'idle' })
  })

  it('brief connects to the entry step, and the sequential step edge is rendered', () => {
    const { edges } = planToVisualNodes(STEPS_PLAN)
    expect(edges.find((e) => e.source === '__brief__' && e.target === 'review')).toBeDefined()
    expect(edges.find((e) => e.source === 'review' && e.target === 'apply-patch')).toBeDefined()
  })

  it('hasSynthesis is false — steps-shaped Flows have no synthesizer node', () => {
    const { hasSynthesis } = planToVisualNodes(STEPS_PLAN)
    expect(hasSynthesis).toBe(false)
  })
})
