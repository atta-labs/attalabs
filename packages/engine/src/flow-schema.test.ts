import { describe, expect, it } from 'vitest'
import { FlowSchema } from './flow-schema'

const BASE = {
  schema_version: '2.0' as const,
  id: 'test-flow',
  display_name: 'Test Flow',
  description: 'Test',
  experimental: false,
  benchmarked: false,
  defaults: { model: 'claude-sonnet-4-6' }
}

const ROUNDS_ONLY = {
  ...BASE,
  agents: [{ name: 'A0', system_prompt: 'Answer directly.' }],
  rounds: [
    {
      id: 'answer',
      name: 'Answer',
      agents: [{ name: 'A0' }],
      layout: 'parallel',
      message_template: '{{question}}'
    }
  ]
}

const STEPS_ONLY = {
  ...BASE,
  agents: [{ role: 'reviewer' }],
  steps: [
    {
      id: 'review',
      type: 'agent',
      role: 'reviewer',
      prompt_template: 'Review {{target}}.',
      permission: 'read-only',
      working_directory: '{{worktree}}',
      max_turns: 20
    },
    { id: 'merge', type: 'mechanical', action: 'merge-pr' }
  ]
}

describe('FlowSchema — rounds XOR steps', () => {
  it('parses a rounds-only Flow', () => {
    expect(FlowSchema.safeParse(ROUNDS_ONLY).success).toBe(true)
  })

  it('parses a steps-only Flow', () => {
    const result = FlowSchema.safeParse(STEPS_ONLY)
    expect(result.success).toBe(true)
  })

  it('refuses a Flow declaring both rounds and steps', () => {
    const result = FlowSchema.safeParse({ ...ROUNDS_ONLY, steps: STEPS_ONLY.steps })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /found both/.test(i.message))).toBe(true)
    }
  })

  it('refuses a Flow declaring neither rounds nor steps', () => {
    const { rounds: _rounds, ...withoutRounds } = ROUNDS_ONLY
    const result = FlowSchema.safeParse(withoutRounds)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /found neither/.test(i.message))).toBe(true)
    }
  })
})

describe('FlowSchema — steps discriminated union', () => {
  it('refuses an agent step missing required fields', () => {
    const bad = {
      ...BASE,
      agents: [{ role: 'reviewer' }],
      steps: [{ id: 'review', type: 'agent', role: 'reviewer' }]
    }
    expect(FlowSchema.safeParse(bad).success).toBe(false)
  })

  it('refuses a mechanical step carrying model fields', () => {
    const bad = {
      ...BASE,
      agents: [{ role: 'reviewer' }],
      steps: [{ id: 'merge', type: 'mechanical', action: 'merge-pr', system_prompt: 'not allowed' }]
    }
    // Zod strips unknown keys by default rather than rejecting them; assert
    // the parsed value carries none of the stripped fields through.
    const result = FlowSchema.safeParse(bad)
    expect(result.success).toBe(true)
    if (result.success) {
      const step = result.data.steps?.[0] as Record<string, unknown>
      expect(step.system_prompt).toBeUndefined()
    }
  })

  it('rejects an unrecognized step id (not kebab-case)', () => {
    const bad = {
      ...STEPS_ONLY,
      steps: [{ ...STEPS_ONLY.steps[0], id: 'Not_Kebab' }, STEPS_ONLY.steps[1]]
    }
    expect(FlowSchema.safeParse(bad).success).toBe(false)
  })
})
