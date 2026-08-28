import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileFlow } from './compile-flow'
import { loadFlow, loadStepsFlow } from './flow-loader'
import type { Flow } from './flow-types'
import type { Plan, PlanAgentNode, PlanEdge, PlanNode } from './types'

const QUESTION = 'Test question for baseline snapshot'
const MODEL = 'claude-sonnet-4-6'

// __dirname = packages/engine/src; yamls are at ../../agents/vada-deliberation/yamls/
const YAMLS_DIR = join(__dirname, '../../agents/vada-deliberation/yamls')
const BASELINE_DIR = join(__dirname, 'baselines')

// ── Fixtures ───────────────────────────────────────────────────────────────────

function soloFlow(): Flow {
  return {
    schemaVersion: '2.0',
    id: 'solo-test',
    displayName: 'Solo Test',
    description: 'Solo',
    experimental: false,
    benchmarked: false,
    defaults: { model: MODEL },
    agents: [{ name: 'A', systemPrompt: 'Answer.' }],
    rounds: [
      { id: 'answer', name: 'Answer', layout: 'serial', agents: [{ name: 'A' }], messageTemplate: '{{question}}' }
    ]
  }
}

function brokeredNoSynthFlow(): Flow {
  return {
    schemaVersion: '2.0',
    id: 'brok-test',
    displayName: 'Brok Test',
    description: 'Brokered no synth',
    experimental: false,
    benchmarked: false,
    defaults: { model: MODEL },
    agents: [
      { name: 'R1', systemPrompt: 'Review.' },
      { name: 'R2', systemPrompt: 'Review.' },
      { name: 'R3', systemPrompt: 'Review.' }
    ],
    rounds: [
      {
        id: 'review',
        name: 'Review',
        layout: 'parallel',
        agents: [
          { name: 'R1', messageTemplate: '{{question}}' },
          { name: 'R2', messageTemplate: '{{question}}' },
          { name: 'R3', messageTemplate: '{{question}}' }
        ]
      }
    ]
  }
}

function brokeredSynthFlow(): Flow {
  return {
    schemaVersion: '2.0',
    id: 'brok-synth-test',
    displayName: 'Brok Synth',
    description: 'Brokered with synth',
    experimental: false,
    benchmarked: false,
    defaults: { model: MODEL },
    agents: [
      { name: 'R1', systemPrompt: 'Review.' },
      { name: 'R2', systemPrompt: 'Review.' },
      { name: 'S', systemPrompt: 'Synthesize.' }
    ],
    rounds: [
      {
        id: 'review',
        name: 'Review',
        layout: 'parallel',
        agents: [
          { name: 'R1', messageTemplate: '{{question}}' },
          { name: 'R2', messageTemplate: '{{question}}' }
        ]
      },
      { id: 'synthesis', name: 'Synthesis', layout: 'serial', agents: [{ name: 'S' }], messageTemplate: 'Synthesize.' }
    ]
  }
}

function roundsAuditFlow(): Flow {
  return {
    schemaVersion: '2.0',
    id: 'rounds-test',
    displayName: 'Rounds Test',
    description: 'Rounds audit',
    experimental: false,
    benchmarked: false,
    defaults: { model: MODEL },
    agents: [
      { name: 'D1', systemPrompt: 'Debate.' },
      { name: 'D2', systemPrompt: 'Debate.' },
      { name: 'T', systemPrompt: 'Synthesize.' },
      { name: 'Au', systemPrompt: 'Audit.' }
    ],
    rounds: [
      {
        id: 'debate',
        name: 'Debate',
        layout: 'serial',
        repeats: 2,
        agents: [{ name: 'D1' }, { name: 'D2' }],
        messageTemplate: '{{question}}'
      },
      { id: 'synthesis', name: 'Synthesis', layout: 'serial', agents: [{ name: 'T' }], messageTemplate: 'Synth.' },
      {
        id: 'audit',
        name: 'Audit',
        layout: 'serial',
        agents: [{ name: 'Au' }],
        messageTemplate: 'Audit.',
        onFailure: {
          action: 'revise',
          target: 'synthesis',
          maxRevisions: 1,
          signal: { type: 'contains', value: 'FLAG', caseSensitive: false }
        }
      }
    ]
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function nodeIds(plan: Plan): string[] {
  return Object.keys(plan.graph.nodes)
}

function edgesOf(plan: Plan): PlanEdge[] {
  return plan.graph.edges
}

// Used by the four legacy (rounds-shaped) describe blocks below, which never
// produce agent-spawn/mechanical nodes. Use nodeByAny for steps-shape tests.
function nodeBy(plan: Plan, id: string): PlanAgentNode {
  const n = plan.graph.nodes[id]
  if (!n) throw new Error(`Node ${id} not found in [${nodeIds(plan).join(', ')}]`)
  if (n.role === 'agent-spawn' || n.role === 'mechanical') {
    throw new Error(`Node ${id} is a step node (role '${n.role}') — use nodeByAny instead`)
  }
  return n
}

function nodeByAny(plan: Plan, id: string): PlanNode {
  const n = plan.graph.nodes[id]
  if (!n) throw new Error(`Node ${id} not found in [${nodeIds(plan).join(', ')}]`)
  return n
}

function loadBaseline(specId: string): Plan {
  const raw = readFileSync(join(BASELINE_DIR, `plan-baseline-${specId}.json`), 'utf-8')
  return JSON.parse(raw) as Plan
}

function loadYaml(name: string): Flow {
  return loadFlow(readFileSync(join(YAMLS_DIR, `${name}.yaml`), 'utf-8'))
}

function sortEdge(e: PlanEdge): string {
  return `${e.from}→${e.to}:${e.kind}`
}

// ── Solo ───────────────────────────────────────────────────────────────────────

describe('compileFlow — solo shape', () => {
  it('emits a single solo node', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    expect(nodeIds(plan)).toEqual(['solo'])
  })

  it('solo node has correct role/kind/metadata', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    const n = nodeBy(plan, 'solo')
    expect(n.role).toBe('solo')
    expect(n.kind).toBe('solo-agent')
    expect(n.agentName).toBe('A')
    expect(n.metadata).toEqual({})
  })

  it('responseMode=synthesize, responseNode=solo, maxRevisions=0', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    expect(plan.responseMode).toBe('synthesize')
    expect(plan.responseNode).toBe('solo')
    expect(plan.maxRevisions).toBe(0)
  })

  it('no edges', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    expect(plan.graph.edges).toHaveLength(0)
    expect(plan.graph.conditionalEdges).toHaveLength(0)
  })

  it('teamName equals flow.id', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    expect(plan.teamName).toBe('solo-test')
  })

  it('classifierModes is undefined when no agents declare classifiers', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    expect(plan.classifierModes).toBeUndefined()
  })
})

// ── Brokered no-synth ─────────────────────────────────────────────────────────

describe('compileFlow — brokered-no-synth shape', () => {
  it('emits reviewer-{name} nodes for each agent', () => {
    const plan = compileFlow(brokeredNoSynthFlow(), QUESTION)
    expect(nodeIds(plan)).toEqual(['reviewer-R1', 'reviewer-R2', 'reviewer-R3'])
  })

  it('all reviewer nodes have role=solo kind=parallel-peer', () => {
    const plan = compileFlow(brokeredNoSynthFlow(), QUESTION)
    for (const id of ['reviewer-R1', 'reviewer-R2', 'reviewer-R3']) {
      const n = nodeBy(plan, id)
      expect(n.role).toBe('solo')
      expect(n.kind).toBe('parallel-peer')
    }
  })

  it('ordering edges between reviewers, no flow edges', () => {
    const plan = compileFlow(brokeredNoSynthFlow(), QUESTION)
    const edges = edgesOf(plan)
    expect(edges).toHaveLength(2)
    expect(edges[0]).toEqual({ from: 'reviewer-R1', to: 'reviewer-R2', kind: 'ordering' })
    expect(edges[1]).toEqual({ from: 'reviewer-R2', to: 'reviewer-R3', kind: 'ordering' })
    expect(plan.graph.conditionalEdges).toHaveLength(0)
  })

  it('responseMode=concatenate, no responseNode', () => {
    const plan = compileFlow(brokeredNoSynthFlow(), QUESTION)
    expect(plan.responseMode).toBe('concatenate')
    expect(plan.responseNode).toBeUndefined()
  })

  it('entryNode is first reviewer', () => {
    const plan = compileFlow(brokeredNoSynthFlow(), QUESTION)
    expect(plan.graph.entryNode).toBe('reviewer-R1')
  })
})

// ── Brokered synth ────────────────────────────────────────────────────────────

describe('compileFlow — brokered-synth shape', () => {
  it('emits reviewer nodes plus brokered-synthesis', () => {
    const plan = compileFlow(brokeredSynthFlow(), QUESTION)
    expect(nodeIds(plan)).toEqual(['reviewer-R1', 'reviewer-R2', 'brokered-synthesis'])
  })

  it('brokered-synthesis node has role=terminal kind=synthesizer', () => {
    const plan = compileFlow(brokeredSynthFlow(), QUESTION)
    const n = nodeBy(plan, 'brokered-synthesis')
    expect(n.role).toBe('terminal')
    expect(n.kind).toBe('synthesizer')
    expect(n.agentName).toBe('S')
  })

  it('flow edge from last reviewer to brokered-synthesis', () => {
    const plan = compileFlow(brokeredSynthFlow(), QUESTION)
    const flowEdge = edgesOf(plan).find((e) => e.kind === 'flow')
    expect(flowEdge).toEqual({ from: 'reviewer-R2', to: 'brokered-synthesis', kind: 'flow' })
  })

  it('responseMode=synthesize, responseNode=brokered-synthesis', () => {
    const plan = compileFlow(brokeredSynthFlow(), QUESTION)
    expect(plan.responseMode).toBe('synthesize')
    expect(plan.responseNode).toBe('brokered-synthesis')
  })
})

// ── Rounds-audit ──────────────────────────────────────────────────────────────

describe('compileFlow — rounds-audit shape', () => {
  it('emits the correct node set', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    const ids = nodeIds(plan)
    // 2 repeats × 2 debaters = 4; 2 terminals; 1 sentinel; 2 audit slots × 1 auditor = 2
    expect(ids).toContain('round-0-D1')
    expect(ids).toContain('round-0-D2')
    expect(ids).toContain('round-1-D1')
    expect(ids).toContain('round-1-D2')
    expect(ids).toContain('terminal-0')
    expect(ids).toContain('terminal-1')
    expect(ids).toContain('__END__')
    expect(ids).toContain('audit-Au-0')
    expect(ids).toContain('audit-Au-1')
    expect(ids).toHaveLength(9)
  })

  it('debate node metadata has roundIndex and totalRounds', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    expect(nodeBy(plan, 'round-0-D1').metadata).toEqual({ roundIndex: 0, totalRounds: 2 })
    expect(nodeBy(plan, 'round-1-D2').metadata).toEqual({ roundIndex: 1, totalRounds: 2 })
  })

  it('terminal-0 is synthesizer, terminal-1 is revision-terminal', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    expect(nodeBy(plan, 'terminal-0').kind).toBe('synthesizer')
    expect(nodeBy(plan, 'terminal-1').kind).toBe('revision-terminal')
  })

  it('entryNode is first debate agent of round 0', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    expect(plan.graph.entryNode).toBe('round-0-D1')
  })

  it('flow edge from last debate agent to terminal-0', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    const flowEdge = edgesOf(plan).find((e) => e.to === 'terminal-0')
    expect(flowEdge).toEqual({ from: 'round-1-D2', to: 'terminal-0', kind: 'flow' })
  })

  it('conditional edge from last auditor in slot 0 only', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    expect(plan.graph.conditionalEdges).toHaveLength(1)
    const ce = plan.graph.conditionalEdges[0]!
    expect(ce.from).toBe('audit-Au-0')
    expect(ce.ifTrue).toBe('terminal-1')
    expect(ce.ifFalse).toBe('__END__')
    expect(ce.condition.check).toEqual({ type: 'contains', value: 'FLAG', caseSensitive: false })
  })

  it('maxRevisions=1, responseMode=synthesize, responseNode=terminal-0', () => {
    const plan = compileFlow(roundsAuditFlow(), QUESTION)
    expect(plan.maxRevisions).toBe(1)
    expect(plan.responseMode).toBe('synthesize')
    expect(plan.responseNode).toBe('terminal-0')
  })
})

// ── classifierModes ───────────────────────────────────────────────────────────

describe('compileFlow — unsupported signal types', () => {
  it('throws when signal.type is "equals" (not yet implemented in v2)', () => {
    const flow = loadYaml('sparring')
    const auditRoundIndex = flow.rounds.findIndex((r) => r.onFailure?.action === 'revise')
    expect(auditRoundIndex).toBeGreaterThanOrEqual(0)
    const mutated: typeof flow = {
      ...flow,
      rounds: flow.rounds.map((r, i) =>
        i === auditRoundIndex && r.onFailure
          ? { ...r, onFailure: { ...r.onFailure, signal: { ...r.onFailure.signal, type: 'equals' as const } } }
          : r
      )
    }
    expect(() => compileFlow(mutated, 'test question')).toThrow("Unsupported signal type 'equals'")
  })
})

describe('compileFlow — classifierModes', () => {
  it('is undefined when no agents declare classifier', () => {
    const plan = compileFlow(soloFlow(), QUESTION)
    expect(plan.classifierModes).toBeUndefined()
  })

  it('includes all agents that declare classifier', () => {
    const flow = soloFlow()
    flow.agents[0]!.classifier = { mode: 'auto' }
    const plan = compileFlow(flow, QUESTION)
    expect(plan.classifierModes).toEqual({ A: 'auto' })
  })
})

// ── Baseline equivalence ──────────────────────────────────────────────────────

describe('compileFlow — baseline graph equivalence', () => {
  it('a0-baseline: graph and response shape match v1 baseline', () => {
    const plan = compileFlow(loadYaml('a0-baseline'), QUESTION, MODEL)
    const baseline = loadBaseline('a0-baseline')

    expect(plan.graph.entryNode).toBe(baseline.graph.entryNode)
    expect(nodeIds(plan)).toEqual(Object.keys(baseline.graph.nodes))
    for (const [id, bn] of Object.entries(baseline.graph.nodes) as [string, PlanAgentNode][]) {
      const n = nodeBy(plan, id)
      expect(n.role).toBe(bn.role)
      expect(n.kind).toBe(bn.kind)
      expect(n.agentName).toBe(bn.agentName)
    }
    expect(plan.responseMode).toBe(baseline.responseMode)
    expect(plan.responseNode).toBe(baseline.responseNode)
    expect(plan.maxRevisions).toBe(baseline.maxRevisions)
    expect(plan.teamName).toBe(baseline.teamName)
  })

  it('sparring: graph structure matches v1 baseline exactly', () => {
    const plan = compileFlow(loadYaml('sparring'), QUESTION, MODEL)
    const baseline = loadBaseline('sparring')

    expect(plan.graph.entryNode).toBe(baseline.graph.entryNode)
    expect(nodeIds(plan).sort()).toEqual(Object.keys(baseline.graph.nodes).sort())

    for (const [id, bn] of Object.entries(baseline.graph.nodes) as [string, PlanAgentNode][]) {
      const n = nodeBy(plan, id)
      expect(n.role).toBe(bn.role)
      expect(n.kind).toBe(bn.kind)
      expect(n.agentName).toBe(bn.agentName)
      expect(n.metadata).toEqual(bn.metadata)
    }

    expect(plan.graph.edges.map(sortEdge).sort()).toEqual(baseline.graph.edges.map(sortEdge).sort())

    expect(plan.graph.conditionalEdges).toHaveLength(baseline.graph.conditionalEdges.length)
    const ce = plan.graph.conditionalEdges[0]!
    const bce = baseline.graph.conditionalEdges[0]!
    expect(ce.from).toBe(bce.from)
    expect(ce.ifTrue).toBe(bce.ifTrue)
    expect(ce.ifFalse).toBe(bce.ifFalse)
    expect(ce.condition.check).toEqual(bce.condition.check)

    expect(plan.responseMode).toBe(baseline.responseMode)
    expect(plan.responseNode).toBe(baseline.responseNode)
    expect(plan.maxRevisions).toBe(baseline.maxRevisions)
    expect(plan.teamName).toBe(baseline.teamName)
  })

  it('brokered-trio: graph structure matches v1 baseline', () => {
    const plan = compileFlow(loadYaml('brokered-trio'), QUESTION, MODEL)
    const baseline = loadBaseline('brokered-trio')

    expect(plan.graph.entryNode).toBe(baseline.graph.entryNode)
    expect(nodeIds(plan).sort()).toEqual(Object.keys(baseline.graph.nodes).sort())
    expect(plan.graph.edges.map(sortEdge).sort()).toEqual(baseline.graph.edges.map(sortEdge).sort())
    expect(plan.responseMode).toBe(baseline.responseMode)
    expect(plan.responseNode).toBe(baseline.responseNode)
    expect(plan.maxRevisions).toBe(baseline.maxRevisions)
    expect(plan.teamName).toBe(baseline.teamName)
  })

  it('vada-reviewers-synthesis: brokered-synth graph matches v1 baseline', () => {
    const plan = compileFlow(loadYaml('vada-reviewers-synthesis'), QUESTION, MODEL)
    const baseline = loadBaseline('vada-reviewers-synthesis')

    expect(plan.graph.entryNode).toBe(baseline.graph.entryNode)
    expect(nodeIds(plan).sort()).toEqual(Object.keys(baseline.graph.nodes).sort())
    expect(plan.graph.edges.map(sortEdge).sort()).toEqual(baseline.graph.edges.map(sortEdge).sort())
    expect(plan.responseMode).toBe(baseline.responseMode)
    expect(plan.responseNode).toBe(baseline.responseNode)
  })
})

const MINIMAL_STEPS_YAML = `
schema_version: "2.0"
id: test-steps
display_name: Test Steps
description: A test steps flow
experimental: false

defaults:
  model: claude-sonnet-4-6

agents:
  - role: reviewer

steps:
  - id: review
    type: agent
    role: reviewer
    prompt_template: "Review {{target}}."
    permission: read-only
    working_directory: "{{worktree}}"
    max_turns: 20
  - id: apply-patch
    type: mechanical
    action: git-apply
`

describe('compileFlow — steps-shaped Flow (task 2, the fifth shape)', () => {
  it('compiles without throwing — task 1 (#981) left this as a NotImplementedError; task 2 (#982) implements it', () => {
    const stepsFlow = loadStepsFlow(MINIMAL_STEPS_YAML)
    expect(() => compileFlow(stepsFlow, QUESTION, MODEL)).not.toThrow()
  })

  it("emits one node per step, id = the step's own declared id verbatim", () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    expect(nodeIds(plan)).toEqual(['review', 'apply-patch'])
  })

  it('AgentStep compiles to a node with role/kind "agent-spawn" carrying the step\'s own fields', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    const n = nodeByAny(plan, 'review')
    expect(n.role).toBe('agent-spawn')
    expect(n.kind).toBe('agent-spawn')
    if (n.role !== 'agent-spawn') throw new Error('unreachable')
    expect(n.promptTemplate).toBe('Review {{target}}.')
    expect(n.agentRole).toBe('reviewer')
    expect(n.permission).toBe('read-only')
    expect(n.workingDirectory).toBe('{{worktree}}')
    expect(n.maxTurns).toBe(20)
    expect(n.resume).toBeUndefined()
    expect('agentName' in n).toBe(false)
    expect('inputTemplate' in n).toBe(false)
  })

  it('MechanicalStep compiles to a node with role/kind "mechanical" carrying only its action', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    const n = nodeByAny(plan, 'apply-patch')
    expect(n.role).toBe('mechanical')
    expect(n.kind).toBe('mechanical')
    if (n.role !== 'mechanical') throw new Error('unreachable')
    expect(n.action).toBe('git-apply')
    expect('agentName' in n).toBe(false)
    expect('promptTemplate' in n).toBe(false)
  })

  it('sequential flow edge between consecutive steps, in declaration order', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    expect(edgesOf(plan)).toEqual([{ from: 'review', to: 'apply-patch', kind: 'flow' }])
  })

  it('entryNode is the first declared step', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    expect(plan.graph.entryNode).toBe('review')
  })

  it('plan.agents is empty — no Plan.agents entry for AgentRole-shaped steps (see PR body)', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    expect(plan.agents).toEqual({})
  })

  it('maxRevisions is 0 — a steps-shaped Flow structurally has no rounds/onFailure', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    expect(plan.maxRevisions).toBe(0)
  })

  it('responseMode/responseNode are left unset — no task in this tranche defines them for this shape', () => {
    const plan = compileFlow(loadStepsFlow(MINIMAL_STEPS_YAML), QUESTION, MODEL)
    expect(plan.responseMode).toBeUndefined()
    expect(plan.responseNode).toBeUndefined()
  })
})
