import { describe, expect, it } from 'vitest'
import { NotImplementedError } from '../errors'
import type { Flow, FlowAgent, Round, Step, StepDecision, StepsFlow } from '../flow-types'
import { InvalidFlowConfigError, resolveAgentFailure, validateFlow, validateStepsFlow } from '../validate-flow'

// ── Shared fixtures ──────────────────────────────────────────────────────────

const agentA: FlowAgent = { name: 'AgentA', systemPrompt: 'You are A.' }
const agentB: FlowAgent = { name: 'AgentB', systemPrompt: 'You are B.' }

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    schemaVersion: '2.0',
    id: 'test-flow',
    displayName: 'Test Flow',
    description: 'Test',
    experimental: false,
    benchmarked: false,
    defaults: { model: 'claude-sonnet-4-6' },
    agents: [agentA],
    rounds: [
      {
        id: 'answer',
        name: 'Answer',
        agents: [{ name: 'AgentA' }],
        layout: 'parallel',
        messageTemplate: '{{question}}'
      }
    ],
    ...overrides
  }
}

// ── Rule 1: rounds.length >= 1 ───────────────────────────────────────────────

describe('validateFlow — Rule 1: rounds non-empty', () => {
  it('passes with one round', () => {
    expect(() => validateFlow(makeFlow())).not.toThrow()
  })

  it('throws when rounds array is empty', () => {
    expect(() => validateFlow(makeFlow({ rounds: [] }))).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(makeFlow({ rounds: [] }))).toThrow('at least one round')
  })
})

// ── Rule 2: round ids unique within flow ────────────────────────────────────

describe('validateFlow — Rule 2: unique round ids', () => {
  it('passes with distinct round ids', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'r1', name: 'R1', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        { id: 'r2', name: 'R2', agents: [{ name: 'AgentB' }], layout: 'parallel', messageTemplate: '{{question}}' }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when two rounds share an id', () => {
    const flow = makeFlow({
      rounds: [
        { id: 'dup', name: 'Dup1', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        { id: 'dup', name: 'Dup2', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow("duplicate round id 'dup'")
  })
})

// ── Rule 3: on_failure.target references a prior round ──────────────────────

describe('validateFlow — Rule 3: on_failure.target must be a prior round', () => {
  const sparringRounds: Round[] = [
    { id: 'spar', name: 'Spar', agents: [{ name: 'AgentA' }], layout: 'serial', messageTemplate: '{{question}}' },
    {
      id: 'synthesis',
      name: 'Synthesis',
      agents: [{ name: 'AgentB' }],
      layout: 'parallel',
      messageTemplate: '{{question}}'
    },
    {
      id: 'audit',
      name: 'Audit',
      agents: [{ name: 'AgentA' }],
      layout: 'parallel',
      messageTemplate: '{{question}}',
      onFailure: {
        action: 'revise',
        target: 'synthesis',
        maxRevisions: 1,
        signal: { type: 'contains', value: 'FLAG' }
      }
    }
  ]

  it('passes when target references a prior round', () => {
    const flow = makeFlow({ agents: [agentA, agentB], rounds: sparringRounds })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when target references a nonexistent round', () => {
    const rounds: Round[] = [
      {
        id: 'audit',
        name: 'Audit',
        agents: [{ name: 'AgentA' }],
        layout: 'parallel',
        messageTemplate: '{{question}}',
        onFailure: {
          action: 'revise',
          target: 'ghost',
          maxRevisions: 1,
          signal: { type: 'contains', value: 'FLAG' }
        }
      }
    ]
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow('does not exist')
  })

  it('throws when target references a future round (forward reference)', () => {
    const rounds: Round[] = [
      {
        id: 'audit',
        name: 'Audit',
        agents: [{ name: 'AgentA' }],
        layout: 'parallel',
        messageTemplate: '{{question}}',
        onFailure: {
          action: 'revise',
          target: 'synthesis',
          maxRevisions: 1,
          signal: { type: 'contains', value: 'FLAG' }
        }
      },
      {
        id: 'synthesis',
        name: 'Synthesis',
        agents: [{ name: 'AgentA' }],
        layout: 'parallel',
        messageTemplate: '{{question}}'
      }
    ]
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow('not a prior round')
  })

  it('throws when target is the round itself (self-reference)', () => {
    const rounds: Round[] = [
      {
        id: 'audit',
        name: 'Audit',
        agents: [{ name: 'AgentA' }],
        layout: 'parallel',
        messageTemplate: '{{question}}',
        onFailure: {
          action: 'revise',
          target: 'audit',
          maxRevisions: 1,
          signal: { type: 'contains', value: 'FLAG' }
        }
      }
    ]
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow('not a prior round')
  })
})

// ── Rule 4: agent names in rounds exist in flow.agents ──────────────────────

describe('validateFlow — Rule 4: agent refs must exist in flow.agents', () => {
  it('passes when all referenced agents exist', () => {
    const flow = makeFlow({ agents: [agentA, agentB] })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when a round references an unknown agent', () => {
    const rounds: Round[] = [
      {
        id: 'review',
        name: 'Review',
        agents: [{ name: 'Ghost' }],
        layout: 'parallel',
        messageTemplate: '{{question}}'
      }
    ]
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(makeFlow({ rounds }))).toThrow("unknown agent 'Ghost'")
  })
})

// ── Rule 5: repeats >= 1 ────────────────────────────────────────────────────

describe('validateFlow — Rule 5: repeats >= 1', () => {
  it('passes without repeats field', () => {
    expect(() => validateFlow(makeFlow())).not.toThrow()
  })

  it('passes with repeats: 1', () => {
    const flow = makeFlow({
      rounds: [
        {
          id: 'r',
          name: 'R',
          agents: [{ name: 'AgentA' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          repeats: 1
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('passes with repeats: 3', () => {
    const flow = makeFlow({
      rounds: [
        {
          id: 'r',
          name: 'R',
          agents: [{ name: 'AgentA' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          repeats: 3
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when repeats is 0', () => {
    const flow = makeFlow({
      rounds: [
        {
          id: 'r',
          name: 'R',
          agents: [{ name: 'AgentA' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          repeats: 0
        }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow('repeats must be >= 1')
  })
})

// ── Rule 6: max_revisions >= 1 when action='revise' ─────────────────────────

describe('validateFlow — Rule 6: max_revisions >= 1 when action=revise', () => {
  it('passes with max_revisions: 1', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'spar', name: 'Spar', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        {
          id: 'audit',
          name: 'Audit',
          agents: [{ name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          onFailure: { action: 'revise', target: 'spar', maxRevisions: 1, signal: { type: 'contains', value: 'FLAG' } }
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when max_revisions is 0 and action=revise (bypassed Zod)', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'spar', name: 'Spar', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        {
          id: 'audit',
          name: 'Audit',
          agents: [{ name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          // Cast to bypass TypeScript — simulates a Flow constructed without Zod
          onFailure: {
            action: 'revise',
            target: 'spar',
            maxRevisions: 0 as unknown as 1,
            signal: { type: 'contains', value: 'FLAG' }
          }
        }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow('max_revisions must be >= 1')
  })
})

// ── Rule 7: action='revise' requires target + max_revisions ─────────────────

describe('validateFlow — Rule 7: revise requires target and max_revisions', () => {
  it('passes with action=abort (no target or max needed)', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'r1', name: 'R1', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        {
          id: 'r2',
          name: 'R2',
          agents: [{ name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          onFailure: { action: 'abort', signal: { type: 'contains', value: 'STOP' } }
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('passes with action=continue (no target or max needed)', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'r1', name: 'R1', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        {
          id: 'r2',
          name: 'R2',
          agents: [{ name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          onFailure: { action: 'continue', signal: { type: 'contains', value: 'WARN' } }
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when action=revise but target is missing', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'r1', name: 'R1', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        {
          id: 'r2',
          name: 'R2',
          agents: [{ name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          onFailure: {
            action: 'revise',
            maxRevisions: 1,
            signal: { type: 'contains', value: 'FLAG' }
          } as Round['onFailure']
        }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow('requires target')
  })

  it('throws when action=revise but max_revisions is missing', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        { id: 'r1', name: 'R1', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' },
        {
          id: 'r2',
          name: 'R2',
          agents: [{ name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          onFailure: {
            action: 'revise',
            target: 'r1',
            signal: { type: 'contains', value: 'FLAG' }
          } as Round['onFailure']
        }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow('requires max_revisions')
  })
})

// ── Rule 8: message_template required ───────────────────────────────────────

describe('validateFlow — Rule 8: template required (round or all agents)', () => {
  it('passes with round-level template only', () => {
    const flow = makeFlow({
      rounds: [
        { id: 'r', name: 'R', agents: [{ name: 'AgentA' }], layout: 'parallel', messageTemplate: '{{question}}' }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('passes when all agents have their own template (no round template)', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        {
          id: 'r',
          name: 'R',
          agents: [
            { name: 'AgentA', messageTemplate: '{{question}} (concise)' },
            { name: 'AgentB', messageTemplate: '{{question}} (detailed)' }
          ],
          layout: 'parallel'
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('passes when round template exists and some agents also have overrides', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        {
          id: 'r',
          name: 'R',
          agents: [{ name: 'AgentA', messageTemplate: '{{question}} (override)' }, { name: 'AgentB' }],
          layout: 'parallel',
          messageTemplate: '{{question}}'
        }
      ]
    })
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('throws when no round template and at least one agent lacks a template', () => {
    const flow = makeFlow({
      agents: [agentA, agentB],
      rounds: [
        {
          id: 'r',
          name: 'R',
          agents: [{ name: 'AgentA', messageTemplate: '{{question}}' }, { name: 'AgentB' }],
          layout: 'parallel'
        }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow('message_template')
  })
})

// ── Rule 9: rounds with zero agents rejected ─────────────────────────────────

describe('validateFlow — Rule 9: round agents non-empty', () => {
  it('passes with one agent', () => {
    expect(() => validateFlow(makeFlow())).not.toThrow()
  })

  it('throws when round has zero agents (bypassed Zod)', () => {
    const flow = makeFlow({
      rounds: [
        {
          id: 'empty',
          name: 'Empty',
          agents: [] as Round['agents'],
          layout: 'parallel',
          messageTemplate: '{{question}}'
        }
      ]
    })
    expect(() => validateFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateFlow(flow)).toThrow("round 'empty' has no agents")
  })
})

// ── Rule 10 (derivation): resolveAgentFailure defaults ──────────────────────

describe('resolveAgentFailure — Rule 10: layout-dependent defaults', () => {
  it('parallel with no explicit policy → continue', () => {
    expect(resolveAgentFailure({ layout: 'parallel', agentFailure: undefined })).toBe('continue')
  })

  it('serial with no explicit policy → abort', () => {
    expect(resolveAgentFailure({ layout: 'serial', agentFailure: undefined })).toBe('abort')
  })

  it('parallel with explicit abort → abort', () => {
    expect(resolveAgentFailure({ layout: 'parallel', agentFailure: 'abort' })).toBe('abort')
  })

  it('serial with explicit continue → continue', () => {
    expect(resolveAgentFailure({ layout: 'serial', agentFailure: 'continue' })).toBe('continue')
  })
})

// ── Happy path: 4 catalog-shape flows ────────────────────────────────────────

describe('validateFlow — happy path: catalog shapes', () => {
  it('1-round / 1-agent (a0-baseline shape)', () => {
    const flow: Flow = {
      schemaVersion: '2.0',
      id: 'a0-baseline',
      displayName: 'A0',
      description: 'Single-shot baseline',
      experimental: false,
      benchmarked: true,
      defaults: { model: 'claude-sonnet-4-6' },
      agents: [{ name: 'A0', systemPrompt: 'Answer directly.' }],
      rounds: [
        {
          id: 'answer',
          name: 'Answer',
          agents: [{ name: 'A0' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          agentFailure: 'abort'
        }
      ]
    }
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('1-round / N-agents-parallel (vada-reviewers shape)', () => {
    const flow: Flow = {
      schemaVersion: '2.0',
      id: 'vada-reviewers',
      displayName: 'Reviewers',
      description: 'Parallel vendor-diverse review',
      experimental: false,
      benchmarked: true,
      defaults: { model: 'claude-sonnet-4-6' },
      agents: [
        { name: 'Gemini', systemPrompt: 'Review critically.', model: 'gemini-2.5-pro' },
        { name: 'GPT', systemPrompt: 'Review critically.', model: 'gpt-4o' },
        { name: 'Grok', systemPrompt: 'Review critically.', model: 'grok-3' }
      ],
      rounds: [
        {
          id: 'review',
          name: 'Reviewers',
          agents: [{ name: 'Gemini' }, { name: 'GPT' }, { name: 'Grok' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          agentFailure: 'continue'
        }
      ]
    }
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('2-rounds / parallel review + single-agent synthesis (vada-reviewers-synthesis shape)', () => {
    const flow: Flow = {
      schemaVersion: '2.0',
      id: 'vada-reviewers-synthesis',
      displayName: 'Reviewers + Synthesis',
      description: 'Review then synthesize',
      experimental: false,
      benchmarked: true,
      defaults: { model: 'claude-sonnet-4-6' },
      agents: [
        { name: 'Gemini', systemPrompt: 'Review.', model: 'gemini-2.5-pro' },
        { name: 'GPT', systemPrompt: 'Review.', model: 'gpt-4o' },
        { name: 'Grok', systemPrompt: 'Review.', model: 'grok-3' },
        { name: 'Synthesizer', systemPrompt: 'Synthesize.' }
      ],
      rounds: [
        {
          id: 'review',
          name: 'Reviewers',
          agents: [{ name: 'Gemini' }, { name: 'GPT' }, { name: 'Grok' }],
          layout: 'parallel',
          messageTemplate: '{{question}}',
          agentFailure: 'continue'
        },
        {
          id: 'synthesis',
          name: 'Synthesis',
          agents: [{ name: 'Synthesizer' }],
          layout: 'parallel',
          messageTemplate:
            'Question: {{question}}\n{{#each rounds.review.outputs}}[{{this.agent}}] {{this.content}}{{/each}}\nSynthesize.',
          agentFailure: 'abort'
        }
      ]
    }
    expect(() => validateFlow(flow)).not.toThrow()
  })

  it('3-rounds / serial-with-repeats + synthesis + parallel-audit-with-on_failure (sparring shape)', () => {
    const flow: Flow = {
      schemaVersion: '2.0',
      id: 'sparring',
      displayName: 'Sparring',
      description: 'Multi-round sparring with audit and revision',
      experimental: false,
      benchmarked: true,
      defaults: { model: 'claude-sonnet-4-6' },
      agents: [
        { name: 'Strategist', systemPrompt: 'Strategize.' },
        { name: 'Critic', systemPrompt: 'Critique.' },
        { name: 'ConclusionSynthesizer', systemPrompt: 'Synthesize conclusion.', outputFormat: 'structured' },
        { name: 'BlindCritic', systemPrompt: 'Audit blind.' },
        { name: 'FactChecker', systemPrompt: 'Fact check.' }
      ],
      rounds: [
        {
          id: 'spar',
          name: 'Sparring',
          agents: [{ name: 'Strategist' }, { name: 'Critic' }],
          layout: 'serial',
          repeats: 3,
          messageTemplate: '{{question}}',
          agentFailure: 'abort'
        },
        {
          id: 'synthesis',
          name: 'Synthesis',
          agents: [{ name: 'ConclusionSynthesizer' }],
          layout: 'parallel',
          messageTemplate:
            'Question: {{question}}\n{{#each rounds.spar.repeats}}{{#each this.outputs}}{{this.agent}}: {{this.content}}{{/each}}{{/each}}\nGENERATE JSON.',
          agentFailure: 'abort'
        },
        {
          id: 'audit',
          name: 'Audit',
          agents: [{ name: 'BlindCritic' }, { name: 'FactChecker' }],
          layout: 'parallel',
          messageTemplate: 'Question: {{question}}\nConclusion: {{rounds.synthesis.outputs.0.content}}',
          agentFailure: 'continue',
          onFailure: {
            action: 'revise',
            target: 'synthesis',
            maxRevisions: 1,
            signal: { type: 'contains', value: 'FLAG', caseSensitive: false }
          }
        }
      ]
    }
    expect(() => validateFlow(flow)).not.toThrow()
  })
})

// ── Rule 0: validateFlow refuses a steps-shaped Flow by name ───────────────

describe('validateFlow — Rule 0: refuses a steps-shaped Flow', () => {
  it('throws NotImplementedError naming task 2, not a rounds-detection crash', () => {
    const stepsFlow: StepsFlow = {
      schemaVersion: '2.0',
      id: 'test-steps',
      displayName: 'Test Steps',
      description: 'Test',
      experimental: false,
      benchmarked: false,
      defaults: { model: 'claude-sonnet-4-6' },
      agents: [{ role: 'reviewer' }],
      steps: [
        {
          id: 'review',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Review.',
          permission: 'read-only',
          workingDirectory: '/tmp',
          maxTurns: 20
        }
      ]
    }
    expect(() => validateFlow(stepsFlow as unknown as Flow)).toThrow(NotImplementedError)
    expect(() => validateFlow(stepsFlow as unknown as Flow)).toThrow('#982')
  })
})

// ── validateStepsFlow — the steps-shape counterpart ─────────────────────────

function makeStepsFlow(overrides: Partial<StepsFlow> = {}): StepsFlow {
  return {
    schemaVersion: '2.0',
    id: 'test-steps',
    displayName: 'Test Steps',
    description: 'Test',
    experimental: false,
    benchmarked: false,
    defaults: { model: 'claude-sonnet-4-6' },
    agents: [{ role: 'reviewer' }],
    steps: [
      {
        id: 'review',
        type: 'agent',
        role: 'reviewer',
        promptTemplate: 'Review.',
        permission: 'read-only',
        workingDirectory: '/tmp',
        maxTurns: 20
      }
    ],
    ...overrides
  }
}

describe('validateStepsFlow — step ids unique', () => {
  it('passes with distinct step ids', () => {
    expect(() => validateStepsFlow(makeStepsFlow())).not.toThrow()
  })

  it('throws when two steps share an id', () => {
    const steps: Step[] = [
      { id: 'dup', type: 'mechanical', action: 'merge-pr' },
      { id: 'dup', type: 'mechanical', action: 'tag-release' }
    ]
    expect(() => validateStepsFlow(makeStepsFlow({ steps }))).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(makeStepsFlow({ steps }))).toThrow("duplicate step id 'dup'")
  })
})

describe('validateStepsFlow — agent step role must be declared in flow.agents', () => {
  it('passes when the role is declared', () => {
    expect(() => validateStepsFlow(makeStepsFlow())).not.toThrow()
  })

  it('throws when the role is not declared', () => {
    const flow = makeStepsFlow({
      steps: [
        {
          id: 'review',
          type: 'agent',
          role: 'ghost',
          promptTemplate: 'Review.',
          permission: 'read-only',
          workingDirectory: '/tmp',
          maxTurns: 20
        }
      ]
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow("unknown role 'ghost'")
  })
})

describe('validateStepsFlow — resume references only a prior step', () => {
  it('passes when resume references a prior step', () => {
    const flow = makeStepsFlow({
      steps: [
        {
          id: 'review',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Review.',
          permission: 'read-only',
          workingDirectory: '/tmp',
          maxTurns: 20
        },
        {
          id: 'fixup',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Fix.',
          permission: 'read-write',
          workingDirectory: '/tmp',
          maxTurns: 10,
          resume: 'review'
        }
      ]
    })
    expect(() => validateStepsFlow(flow)).not.toThrow()
  })

  it('throws when resume references a nonexistent step', () => {
    const flow = makeStepsFlow({
      steps: [
        {
          id: 'review',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Review.',
          permission: 'read-only',
          workingDirectory: '/tmp',
          maxTurns: 20,
          resume: 'ghost'
        }
      ]
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow('does not exist')
  })

  it('throws when resume references a future step (forward reference)', () => {
    const flow = makeStepsFlow({
      steps: [
        {
          id: 'review',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Review.',
          permission: 'read-only',
          workingDirectory: '/tmp',
          maxTurns: 20,
          resume: 'fixup'
        },
        {
          id: 'fixup',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Fix.',
          permission: 'read-write',
          workingDirectory: '/tmp',
          maxTurns: 10
        }
      ]
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow('not a prior step')
  })

  it('throws when resume references itself (self-reference)', () => {
    const flow = makeStepsFlow({
      steps: [
        {
          id: 'review',
          type: 'agent',
          role: 'reviewer',
          promptTemplate: 'Review.',
          permission: 'read-only',
          workingDirectory: '/tmp',
          maxTurns: 20,
          resume: 'review'
        }
      ]
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow('not a prior step')
  })
})

describe('validateStepsFlow — XOR restated', () => {
  it('throws when a hand-constructed StepsFlow also carries rounds', () => {
    const flow: Record<string, unknown> = { ...makeStepsFlow(), rounds: [] satisfies Round[] }
    expect(() => validateStepsFlow(flow as unknown as StepsFlow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow as unknown as StepsFlow)).toThrow('found both')
  })

  it('throws when steps array is empty', () => {
    expect(() => validateStepsFlow(makeStepsFlow({ steps: [] }))).toThrow('at least one step')
  })
})

// ── validateStepsFlow — step decision (task 1 of engine-conditional-edges-v1) ─

function makeStepsFlowWithDecision(decision: StepDecision): StepsFlow {
  const steps: Step[] = [
    {
      id: 'review',
      type: 'agent',
      role: 'reviewer',
      promptTemplate: 'Review.',
      permission: 'read-only',
      workingDirectory: '/tmp',
      maxTurns: 20
    },
    {
      id: 'apply-patch',
      type: 'mechanical',
      action: 'git-apply',
      decision
    }
  ]
  return makeStepsFlow({ steps })
}

describe('validateStepsFlow — decision.examine references an existing, non-forward step', () => {
  it('passes with a well-formed decision', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'review',
      ifTrue: 'review',
      ifFalse: 'apply-patch',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).not.toThrow()
  })

  it('throws when examine references a nonexistent step', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'ghost',
      ifTrue: 'review',
      ifFalse: 'apply-patch',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow("decision.examine 'ghost' does not exist")
  })

  it('throws when examine references a forward (self) step', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'apply-patch',
      ifTrue: 'review',
      ifFalse: 'apply-patch',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow('is not a prior step')
  })
})

describe('validateStepsFlow — decision.ifTrue must reference an existing, strictly prior step', () => {
  it('throws when ifTrue references a nonexistent step', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'review',
      ifTrue: 'ghost',
      ifFalse: 'apply-patch',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow("decision.ifTrue 'ghost' does not exist")
  })

  it('throws when ifTrue references a non-prior (self) step', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'review',
      ifTrue: 'apply-patch',
      ifFalse: 'apply-patch',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow('is not a prior step')
  })
})

describe('validateStepsFlow — decision.ifFalse references an existing step (no prior-ness constraint)', () => {
  it('passes when ifFalse references the step itself (the continuation path)', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'review',
      ifTrue: 'review',
      ifFalse: 'apply-patch',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).not.toThrow()
  })

  it('throws when ifFalse references a nonexistent step', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'review',
      ifTrue: 'review',
      ifFalse: 'ghost',
      maxRevisions: 1
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow("decision.ifFalse 'ghost' does not exist")
  })
})

describe('validateStepsFlow — decision.maxRevisions >= 1 (defense-in-depth alongside Zod)', () => {
  it('throws when a hand-constructed decision carries maxRevisions < 1, bypassing Zod', () => {
    const flow = makeStepsFlowWithDecision({
      examine: 'review',
      ifTrue: 'review',
      ifFalse: 'apply-patch',
      maxRevisions: 0
    })
    expect(() => validateStepsFlow(flow)).toThrow(InvalidFlowConfigError)
    expect(() => validateStepsFlow(flow)).toThrow('decision.maxRevisions must be >= 1')
  })
})
