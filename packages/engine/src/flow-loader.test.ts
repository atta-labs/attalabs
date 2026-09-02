import { describe, expect, it } from 'vitest'
import { validateStepsFlow } from './validate-flow'
import { loadFlow, loadStepsFlow } from './flow-loader'

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
  - id: merge
    type: mechanical
    action: merge-pr
`

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

  it('throws when given a steps-shaped YAML', () => {
    expect(() => loadFlow(MINIMAL_STEPS_YAML)).toThrow('use loadStepsFlow')
  })
})

describe('loadStepsFlow', () => {
  it('parses a minimal steps flow (one agent step, one mechanical step)', () => {
    const flow = loadStepsFlow(MINIMAL_STEPS_YAML)
    expect(flow.schemaVersion).toBe('2.0')
    expect(flow.id).toBe('test-steps')
    expect(flow.agents).toEqual([{ role: 'reviewer' }])
    expect(flow.steps).toHaveLength(2)

    const review = flow.steps[0]!
    expect(review.type).toBe('agent')
    if (review.type === 'agent') {
      expect(review.role).toBe('reviewer')
      expect(review.promptTemplate).toBe('Review {{target}}.')
      expect(review.permission).toBe('read-only')
      expect(review.workingDirectory).toBe('{{worktree}}')
      expect(review.maxTurns).toBe(20)
      expect(review.resume).toBeUndefined()
    }

    const merge = flow.steps[1]!
    expect(merge.type).toBe('mechanical')
    if (merge.type === 'mechanical') {
      expect(merge.action).toBe('merge-pr')
    }
  })

  it('round-trips a resume reference to a prior step', () => {
    const yaml = MINIMAL_STEPS_YAML.replace(
      '    max_turns: 20\n',
      '    max_turns: 20\n' +
        '  - id: fixup\n' +
        '    type: agent\n' +
        '    role: reviewer\n' +
        '    prompt_template: "Address the review."\n' +
        '    permission: read-write\n' +
        '    working_directory: "{{worktree}}"\n' +
        '    max_turns: 10\n' +
        '    resume: review\n'
    )
    const flow = loadStepsFlow(yaml)
    const fixup = flow.steps.find((s) => s.id === 'fixup')!
    expect(fixup.type).toBe('agent')
    if (fixup.type === 'agent') {
      expect(fixup.resume).toBe('review')
    }
  })

  it('throws when given a rounds-shaped YAML', () => {
    expect(() => loadStepsFlow(MINIMAL_SOLO_YAML)).toThrow('use loadFlow')
  })

  it('loads and validates a minimal steps YAML end to end', () => {
    const flow = loadStepsFlow(MINIMAL_STEPS_YAML)
    expect(() => validateStepsFlow(flow)).not.toThrow()
  })

  it('round-trips a decision from snake_case YAML to camelCase StepDecision', () => {
    const yaml = MINIMAL_STEPS_YAML.replace(
      '    action: merge-pr\n',
      '    action: merge-pr\n' +
        '    decision:\n' +
        '      examine: review\n' +
        '      if_true: review\n' +
        '      if_false: merge\n' +
        '      max_revisions: 3\n'
    )
    const flow = loadStepsFlow(yaml)
    const merge = flow.steps.find((s) => s.id === 'merge')!
    expect(merge.decision).toEqual({
      examine: 'review',
      ifTrue: 'review',
      ifFalse: 'merge',
      maxRevisions: 3
    })
  })

  it('leaves decision undefined when the YAML step omits it', () => {
    const flow = loadStepsFlow(MINIMAL_STEPS_YAML)
    const review = flow.steps.find((s) => s.id === 'review')!
    expect(review.decision).toBeUndefined()
  })
})

describe('rounds XOR steps — refused at load', () => {
  it('refuses a YAML declaring both rounds and steps', () => {
    const both = MINIMAL_SOLO_YAML + MINIMAL_STEPS_YAML.slice(MINIMAL_STEPS_YAML.indexOf('steps:'))
    expect(() => loadFlow(both)).toThrow(/found both/)
    expect(() => loadStepsFlow(both)).toThrow(/found both/)
  })

  it('refuses a YAML declaring neither rounds nor steps', () => {
    const neither = MINIMAL_SOLO_YAML.slice(0, MINIMAL_SOLO_YAML.indexOf('rounds:'))
    expect(() => loadFlow(neither)).toThrow(/found neither/)
    expect(() => loadStepsFlow(neither)).toThrow(/found neither/)
  })
})

describe('agents[] shape is tied to the declared kind, not accepted either way', () => {
  it('refuses a rounds-shaped YAML whose agents are role-only', () => {
    const yaml = MINIMAL_SOLO_YAML.replace(
      '  - name: Agent\n    system_prompt: Answer directly.\n',
      '  - role: Agent\n'
    )
    expect(() => loadFlow(yaml)).toThrow(/agents\[0\]\.name/)
  })

  it('refuses a steps-shaped YAML whose agents carry rounds-shaped LLM config', () => {
    const yaml = MINIMAL_STEPS_YAML.replace('  - role: reviewer\n', '  - name: reviewer\n    system_prompt: Review.\n')
    expect(() => loadStepsFlow(yaml)).toThrow(/Unrecognized keys/)
  })
})
