import { describe, expect, it } from 'vitest'
import { compile } from '../compile'
import { loadSpec } from '../spec-loader'
import { compileSpec } from './spec'
import { InvalidTeamConfigError, InvalidWorkflowConfigError } from '../errors'
import type { Agent, BrokeredWorkflow, Team } from '../types'

// ── Shared agent fixtures ─────────────────────────────────────────────────────

const reviewer1: Agent = { name: 'Reviewer1', description: 'First reviewer.', model: 'test', systemPrompt: 'Review.' }
const reviewer2: Agent = { name: 'Reviewer2', description: 'Second reviewer.', model: 'test', systemPrompt: 'Review.' }
const reviewer3: Agent = { name: 'Reviewer3', description: 'Third reviewer.', model: 'test', systemPrompt: 'Review.' }
const synthesizer: Agent = {
  name: 'Synthesizer',
  description: 'Synthesizes reviews.',
  model: 'test',
  systemPrompt: 'Synthesize.'
}

// ── Without synthesis (existing behavior) ────────────────────────────────────

describe('BrokeredWorkflow without synthesis', () => {
  const workflow: BrokeredWorkflow = {
    type: 'brokered',
    reviewers: [
      { agentName: 'Reviewer1', messageTemplate: '{{question}}' },
      { agentName: 'Reviewer2', messageTemplate: '{{question}}' }
    ]
  }
  const team: Team = {
    name: 'TwoReviewers',
    description: 'Two independent reviewers',
    agents: [reviewer1, reviewer2],
    workflow
  }

  it('produces reviewer nodes with role solo', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.nodes['reviewer-Reviewer1']?.role).toBe('solo')
    expect(plan.graph.nodes['reviewer-Reviewer2']?.role).toBe('solo')
  })

  it('has no synthesis node', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.nodes['brokered-synthesis']).toBeUndefined()
  })

  it('has sequential edges between reviewers only', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const edges = plan.graph.edges.map((e) => `${e.from}→${e.to}`)
    expect(edges).toContain('reviewer-Reviewer1→reviewer-Reviewer2')
    expect(edges).not.toContain('reviewer-Reviewer2→brokered-synthesis')
  })

  it('entry node is the first reviewer', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.entryNode).toBe('reviewer-Reviewer1')
  })

  it('has no conditional edges', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.conditionalEdges).toHaveLength(0)
  })
})

// ── With synthesis ────────────────────────────────────────────────────────────

describe('BrokeredWorkflow with synthesis', () => {
  const workflow: BrokeredWorkflow = {
    type: 'brokered',
    reviewers: [
      { agentName: 'Reviewer1', messageTemplate: '{{question}}' },
      { agentName: 'Reviewer2', messageTemplate: '{{question}}' },
      { agentName: 'Reviewer3', messageTemplate: '{{question}}' }
    ],
    synthesis: {
      agentName: 'Synthesizer',
      messageTemplate: '{{question}}\n{{#each allPreviousOutputs}}{{this.content}}{{/each}}'
    }
  }
  const team: Team = {
    name: 'ThreeReviewersWithSynth',
    description: 'Three reviewers plus synthesizer',
    agents: [reviewer1, reviewer2, reviewer3, synthesizer],
    workflow
  }

  it('produces reviewer nodes with role solo', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.nodes['reviewer-Reviewer1']?.role).toBe('solo')
    expect(plan.graph.nodes['reviewer-Reviewer2']?.role).toBe('solo')
    expect(plan.graph.nodes['reviewer-Reviewer3']?.role).toBe('solo')
  })

  it('produces synthesis node with role terminal and id brokered-synthesis', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const synthNode = plan.graph.nodes['brokered-synthesis']
    expect(synthNode).toBeDefined()
    expect(synthNode?.id).toBe('brokered-synthesis')
    expect(synthNode?.role).toBe('terminal')
    expect(synthNode?.agentName).toBe('Synthesizer')
  })

  it('has edges: R1→R2→R3→brokered-synthesis', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const edges = plan.graph.edges.map((e) => `${e.from}→${e.to}`)
    expect(edges).toContain('reviewer-Reviewer1→reviewer-Reviewer2')
    expect(edges).toContain('reviewer-Reviewer2→reviewer-Reviewer3')
    expect(edges).toContain('reviewer-Reviewer3→brokered-synthesis')
  })

  it('brokered-synthesis has no outgoing unconditional edge (falls through to graph end)', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const outgoing = plan.graph.edges.filter((e) => e.from === 'brokered-synthesis')
    expect(outgoing).toHaveLength(0)
  })

  it('entry node is still the first reviewer', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.entryNode).toBe('reviewer-Reviewer1')
  })

  it('all agents including synthesizer are in plan.agents', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.agents.Synthesizer).toBeDefined()
    expect(plan.agents.Reviewer1).toBeDefined()
  })
})

// ── compileSpec brokered + synthesis YAML ────────────────────────────────────

const BROKERED_SYNTHESIS_YAML = `
schema_version: "1.0"
id: brokered-synthesis-test
display_name: Brokered Synthesis Test
description: Brokered reviewers with synthesis
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Reviewer1
    description: Reviewer one
    system_prompt: "You are reviewer one."
  - name: Reviewer2
    description: Reviewer two
    system_prompt: "You are reviewer two."
  - name: Synthesizer
    description: Synthesizes reviews
    system_prompt: "You synthesize."
reviewers:
  - agent: Reviewer1
    message_template: "{{question}}"
  - agent: Reviewer2
    message_template: "{{question}}"
flow:
  synthesis:
    agent: Synthesizer
    message_template: "Synthesize: {{question}}"
`

describe('compileSpec — brokered with synthesis', () => {
  it('sets responseMode: synthesize', () => {
    const spec = loadSpec(BROKERED_SYNTHESIS_YAML)
    const plan = compileSpec(spec, 'Q?')
    expect(plan.responseMode).toBe('synthesize')
  })

  it('sets responseNode: brokered-synthesis', () => {
    const spec = loadSpec(BROKERED_SYNTHESIS_YAML)
    const plan = compileSpec(spec, 'Q?')
    expect(plan.responseNode).toBe('brokered-synthesis')
  })

  it('brokered-synthesis node exists with role terminal', () => {
    const spec = loadSpec(BROKERED_SYNTHESIS_YAML)
    const plan = compileSpec(spec, 'Q?')
    expect(plan.graph.nodes['brokered-synthesis']?.role).toBe('terminal')
  })

  it('reviewer nodes are solo role', () => {
    const spec = loadSpec(BROKERED_SYNTHESIS_YAML)
    const plan = compileSpec(spec, 'Q?')
    expect(plan.graph.nodes['reviewer-Reviewer1']?.role).toBe('solo')
    expect(plan.graph.nodes['reviewer-Reviewer2']?.role).toBe('solo')
  })
})

// ── Validation: synthesis references unknown agent ────────────────────────────

describe('BrokeredWorkflow validation — synthesis agent reference', () => {
  it('throws InvalidTeamConfigError when synthesis.agentName is not in team.agents', () => {
    const workflow: BrokeredWorkflow = {
      type: 'brokered',
      reviewers: [
        { agentName: 'Reviewer1', messageTemplate: '{{question}}' },
        { agentName: 'Reviewer2', messageTemplate: '{{question}}' }
      ],
      synthesis: {
        agentName: 'NonExistentSynthesizer',
        messageTemplate: '{{question}}'
      }
    }
    const team: Team = {
      name: 'TestTeam',
      description: 'Test',
      agents: [reviewer1, reviewer2],
      workflow
    }
    expect(() => compile({ team, question: 'Q', model: 'test' })).toThrow(InvalidTeamConfigError)
  })

  it('throws InvalidWorkflowConfigError when synthesis.messageTemplate is empty', () => {
    const workflow: BrokeredWorkflow = {
      type: 'brokered',
      reviewers: [
        { agentName: 'Reviewer1', messageTemplate: '{{question}}' },
        { agentName: 'Reviewer2', messageTemplate: '{{question}}' }
      ],
      synthesis: {
        agentName: 'Synthesizer',
        messageTemplate: '   '
      }
    }
    const team: Team = {
      name: 'TestTeam',
      description: 'Test',
      agents: [reviewer1, reviewer2, synthesizer],
      workflow
    }
    expect(() => compile({ team, question: 'Q', model: 'test' })).toThrow(InvalidWorkflowConfigError)
  })
})
