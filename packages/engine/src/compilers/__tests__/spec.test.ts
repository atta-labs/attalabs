import { describe, it, expect } from 'vitest'
import { loadSpec } from '../../spec-loader'
import { compileSpec } from '../spec'
import { compile } from '../../compile'

// ── Inline YAML fixtures ────────────────────────────────────────────────────

const SOLO_YAML = `
schema_version: "1.0"
id: solo-test
display_name: Solo Test
description: Test spec
defaults:
  model: claude-sonnet-4-6
agents:
  - name: A0
    description: Direct answer
    system_prompt: "Answer directly."
flow:
  synthesis:
    agent: A0
    message_template: "{{question}}"
`

const ROUNDS_AUDIT_YAML = `
schema_version: "1.0"
id: rounds-test
display_name: Rounds Test
description: Test spec
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Alpha
    description: Agent Alpha
    system_prompt: "You are Alpha."
  - name: Beta
    description: Agent Beta
    system_prompt: "You are Beta."
  - name: Concluder
    description: Concludes
    system_prompt: "You conclude."
  - name: Auditor
    description: Audits
    system_prompt: "You audit."
flow:
  rounds:
    count: 2
    agents: [Alpha, Beta]
    message_template: |
      {{#if roundIndex}}
      Transcript: {{#each outputsByRound}}{{#each this}}{{this.content}}{{/each}}{{/each}}
      Question: {{question}}
      {{else}}
      {{question}}
      {{/if}}
  synthesis:
    agent: Concluder
    message_template: |
      {{#if isRevision}}
      Revise. Objection: {{auditOutputs.[0].content}}
      {{else}}
      Conclude: {{question}}
      {{/if}}
  audit:
    agents: [Auditor]
    message_template: "Question: {{question}}\nConclusion: {{conclusion}}"
    revision:
      max: 1
      trigger:
        type: contains
        value: FLAG
        case_sensitive: false
`

const BROKERED_YAML = `
schema_version: "1.0"
id: brokered-test
display_name: Brokered Test
description: Test spec
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Reviewer1
    description: Reviewer one
    system_prompt: "You are reviewer one."
  - name: Reviewer2
    description: Reviewer two
    system_prompt: "You are reviewer two."
reviewers:
  - agent: Reviewer1
    message_template: "{{question}}"
  - agent: Reviewer2
    message_template: "{{question}}"
response:
  mode: concatenate
`

// ── Smoke tests ─────────────────────────────────────────────────────────────

describe('compileSpec — smoke tests', () => {
  it('compiles solo spec', () => {
    const spec = loadSpec(SOLO_YAML)
    const plan = compileSpec(spec, 'Is X a good idea?')
    expect(plan.specId).toBe('solo-test')
    expect(plan.responseMode).toBe('synthesize')
    expect(plan.responseNode).toBe('solo')
    expect(plan.graph.nodes.solo).toBeDefined()
  })

  it('compiles rounds+audit spec', () => {
    const spec = loadSpec(ROUNDS_AUDIT_YAML)
    const plan = compileSpec(spec, 'Should I do Y?')
    expect(plan.specId).toBe('rounds-test')
    expect(plan.responseMode).toBe('synthesize')
    expect(plan.responseNode).toBe('terminal-0')
    expect(plan.maxRevisions).toBe(1)
    expect(plan.graph.nodes['round-0-Alpha']).toBeDefined()
    expect(plan.graph.nodes['terminal-0']).toBeDefined()
    expect(plan.graph.nodes['audit-Auditor-0']).toBeDefined()
    expect(plan.graph.conditionalEdges.length).toBeGreaterThan(0)
  })

  it('compiles brokered spec', () => {
    const spec = loadSpec(BROKERED_YAML)
    const plan = compileSpec(spec, 'What should I do?')
    expect(plan.specId).toBe('brokered-test')
    expect(plan.responseMode).toBe('concatenate')
    expect(plan.responseNode).toBeUndefined()
    expect(plan.graph.nodes['reviewer-Reviewer1']).toBeDefined()
    expect(plan.graph.nodes['reviewer-Reviewer2']).toBeDefined()
  })
})

// ── Plan equivalence tests ───────────────────────────────────────────────────

function canonicalize(plan: ReturnType<typeof compile>) {
  return {
    nodeIds: Object.keys(plan.graph.nodes).sort(),
    edges: [...plan.graph.edges].sort((a, b) => `${a.from}->${a.to}`.localeCompare(`${b.from}->${b.to}`)),
    conditionalEdges: [...plan.graph.conditionalEdges]
      .sort((a, b) => a.from.localeCompare(b.from))
      .map((e) => ({ from: e.from, ifTrue: e.ifTrue, ifFalse: e.ifFalse }))
  }
}

describe('compileSpec — Plan equivalence vs compile()', () => {
  it('solo flow: same graph shape as compile({type: solo})', () => {
    const spec = loadSpec(SOLO_YAML)
    const yamlPlan = compileSpec(spec, 'Q?')

    const tsPlan = compile({
      team: {
        name: 'solo-test',
        description: '',
        agents: [{ name: 'A0', description: '', systemPrompt: 'Answer directly.' }],
        workflow: { type: 'solo' }
      },
      question: 'Q?',
      model: 'claude-sonnet-4-6'
    })

    expect(canonicalize(yamlPlan).nodeIds).toEqual(canonicalize(tsPlan).nodeIds)
    expect(canonicalize(yamlPlan).edges).toEqual(canonicalize(tsPlan).edges)
    expect(canonicalize(yamlPlan).conditionalEdges).toEqual(canonicalize(tsPlan).conditionalEdges)
  })

  it('rounds+audit flow: same graph shape as compile({type: rounds, with audit})', () => {
    const spec = loadSpec(ROUNDS_AUDIT_YAML)
    const yamlPlan = compileSpec(spec, 'Q?')

    // The merged template must match what specToTeam produces
    const roundTemplate =
      '{{#if roundIndex}}\nTranscript: {{#each outputsByRound}}{{#each this}}{{this.content}}{{/each}}{{/each}}\nQuestion: {{question}}\n{{else}}\n{{question}}\n{{/if}}'
    const synthesisTemplate =
      '{{#if isRevision}}\nRevise. Objection: {{auditOutputs.[0].content}}\n{{else}}\nConclude: {{question}}\n{{/if}}'
    const mergedTemplate = `{{#if isTerminal}}\n${synthesisTemplate}\n{{else}}\n${roundTemplate}\n{{/if}}`

    const tsPlan = compile({
      team: {
        name: 'rounds-test',
        description: '',
        agents: [
          { name: 'Alpha', description: '', systemPrompt: 'You are Alpha.' },
          { name: 'Beta', description: '', systemPrompt: 'You are Beta.' },
          { name: 'Concluder', description: '', systemPrompt: 'You conclude.' },
          { name: 'Auditor', description: '', systemPrompt: 'You audit.' }
        ],
        workflow: {
          type: 'rounds',
          rounds: 2,
          messageTemplate: mergedTemplate,
          terminalAgent: 'Concluder',
          auditAgent: 'Auditor',
          auditTemplate: 'Question: {{question}}\nConclusion: {{conclusion}}',
          revisionCondition: { type: 'contains', value: 'FLAG', caseSensitive: false },
          maxRevisions: 1
        }
      },
      question: 'Q?',
      model: 'claude-sonnet-4-6'
    })

    expect(canonicalize(yamlPlan).nodeIds).toEqual(canonicalize(tsPlan).nodeIds)
    expect(canonicalize(yamlPlan).edges).toEqual(canonicalize(tsPlan).edges)
    expect(canonicalize(yamlPlan).conditionalEdges).toEqual(canonicalize(tsPlan).conditionalEdges)
  })
})
