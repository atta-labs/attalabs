import { describe, expect, it } from 'vitest'
import { loadFlow } from './flow-loader'

const MINIMAL_SOLO_YAML = `
schema_version: "2.0"
id: test-solo
display_name: Test Solo
description: A test solo flow
experimental: false

defaults:
  model: claude-haiku-4-5-20251001

agents:
  - name: Agent
    system_prompt: Answer directly.

rounds:
  - id: answer
    name: Answer
    layout: serial
    agents:
      - name: Agent
    message_template: "{{question}}"
`

const ROUNDS_AUDIT_YAML = `
schema_version: "2.0"
id: test-rounds
display_name: Test Rounds
description: A test rounds flow
experimental: false

defaults:
  model: claude-haiku-4-5-20251001

agents:
  - name: Debater
    system_prompt: Debate.
    classifier:
      mode: auto
  - name: Synth
    system_prompt: Synthesize.
    classifier:
      mode: skip
  - name: Auditor
    system_prompt: Audit.
    classifier:
      mode: skip

rounds:
  - id: debate
    name: Debate
    layout: serial
    repeats: 2
    agents:
      - name: Debater
    message_template: "{{question}}"
  - id: synthesis
    name: Synthesis
    layout: serial
    agents:
      - name: Synth
    message_template: "Synthesize."
  - id: audit
    name: Audit
    layout: serial
    agents:
      - name: Auditor
    message_template: "Audit."
    on_failure:
      action: revise
      target: synthesis
      max_revisions: 2
      signal:
        type: contains
        value: FLAG
        case_sensitive: false
`

describe('loadFlow', () => {
  it('parses a minimal solo flow', () => {
    const flow = loadFlow(MINIMAL_SOLO_YAML)
    expect(flow.schemaVersion).toBe('2.0')
    expect(flow.id).toBe('test-solo')
    expect(flow.displayName).toBe('Test Solo')
    expect(flow.defaults.model).toBe('claude-haiku-4-5-20251001')
    expect(flow.agents).toHaveLength(1)
    expect(flow.agents[0]!.name).toBe('Agent')
    expect(flow.agents[0]!.systemPrompt).toBe('Answer directly.')
    expect(flow.rounds).toHaveLength(1)
    expect(flow.rounds[0]!.id).toBe('answer')
    expect(flow.rounds[0]!.layout).toBe('serial')
    expect(flow.rounds[0]!.messageTemplate).toBe('{{question}}')
  })

  it('transforms snake_case to camelCase throughout', () => {
    const flow = loadFlow(ROUNDS_AUDIT_YAML)

    // agents: classifier present
    const debater = flow.agents.find((a) => a.name === 'Debater')
    expect(debater?.classifier?.mode).toBe('auto')

    // rounds: repeats, onFailure, signal.caseSensitive
    const audit = flow.rounds.find((r) => r.id === 'audit')
    expect(audit?.onFailure?.action).toBe('revise')
    expect(audit?.onFailure?.target).toBe('synthesis')
    expect(audit?.onFailure?.maxRevisions).toBe(2)
    expect(audit?.onFailure?.signal.type).toBe('contains')
    expect(audit?.onFailure?.signal.value).toBe('FLAG')
    expect(audit?.onFailure?.signal.caseSensitive).toBe(false)

    // rounds[0] repeats
    const debate = flow.rounds.find((r) => r.id === 'debate')
    expect(debate?.repeats).toBe(2)
  })

  it('throws on wrong schema version', () => {
    const yaml = MINIMAL_SOLO_YAML.replace('"2.0"', '"1.0"')
    expect(() => loadFlow(yaml)).toThrow()
  })

  it('throws when id is missing', () => {
    const yaml = MINIMAL_SOLO_YAML.replace('id: test-solo\n', '')
    expect(() => loadFlow(yaml)).toThrow()
  })

  it('throws when agents array is empty', () => {
    const yaml = MINIMAL_SOLO_YAML.replace(
      'agents:\n  - name: Agent\n    system_prompt: Answer directly.\n',
      'agents: []\n'
    )
    expect(() => loadFlow(yaml)).toThrow()
  })

  it('parses custom_tools from YAML into camelCase customTools on the agent (additive field)', () => {
    const yaml = MINIMAL_SOLO_YAML.replace(
      '  - name: Agent\n    system_prompt: Answer directly.\n',
      `  - name: Agent
    system_prompt: Answer directly.
    custom_tools:
      - name: add
        description: Add two numbers
        parameters:
          type: object
          properties:
            a: { type: number }
            b: { type: number }
          required: [a, b]
`
    )
    const flow = loadFlow(yaml)
    const agent = flow.agents[0]!
    expect(agent.customTools).toBeDefined()
    expect(agent.customTools).toHaveLength(1)
    expect(agent.customTools![0]!.name).toBe('add')
    expect(agent.customTools![0]!.description).toBe('Add two numbers')
    expect((agent.customTools![0]!.parameters as { type: string }).type).toBe('object')
  })

  it('leaves customTools undefined when YAML omits custom_tools (the Vāda case)', () => {
    // Additivity: every existing YAML in the catalog has no custom_tools.
    // Loading them must continue to produce agents whose customTools is undefined,
    // so compile-flow propagates undefined into Plan.agents and the adapter takes
    // the byte-identical single-shot path.
    const flow = loadFlow(MINIMAL_SOLO_YAML)
    expect(flow.agents[0]!.customTools).toBeUndefined()
  })
})
