import { describe, expect, it } from 'bun:test'
import type { AgentOutput, ExecutionState, Plan } from '@atta/engine'
import { estimateInputCost, LangGraphAdapter } from './adapter'

describe('estimateInputCost', () => {
  it('computes tokens and cost for a known-priced model', () => {
    const text = 'a'.repeat(10)
    const result = estimateInputCost(text, 'claude-sonnet-4-6')

    expect(result.tokens).toBe(Math.ceil(text.length / 4))
    expect(result.tokens).toBe(3)
    // claude-sonnet-4-6 input rate: $3.00 / 1M tokens → 3 * 3.0 / 1_000_000
    expect(result.costUsd).toBe(0.000009)
  })

  it('returns null cost but still computes tokens for an unpriced model', () => {
    const text = 'a'.repeat(10)
    const result = estimateInputCost(text, 'not-a-real-model')

    expect(result.tokens).toBe(Math.ceil(text.length / 4))
    expect(result.costUsd).toBeNull()
  })

  it('returns zero tokens for an empty string', () => {
    const result = estimateInputCost('', 'claude-sonnet-4-6')

    expect(result.tokens).toBe(0)
  })
})

describe('Conclusion.estimatedCostUsd', () => {
  const output: AgentOutput = {
    agentName: 'Solo',
    content: 'answer',
    tokensInput: 1000,
    tokensOutput: 500,
    elapsedMs: 100,
    model: 'claude-sonnet-4-6'
  }

  const plan: Plan = {
    schemaVersion: '1.0',
    question: 'q',
    model: 'claude-sonnet-4-6',
    agents: {},
    teamName: 'test',
    responseMode: 'concatenate',
    graph: { nodes: {}, edges: [], conditionalEdges: [], entryNode: 'solo' }
  }

  it('is present and numeric on a successful concatenate build', () => {
    const state: ExecutionState = {
      question: 'q',
      plan,
      customVars: {},
      status: 'COMPLETED',
      outputs: { solo: output },
      executionOrder: ['solo'],
      startedAt: Date.now() - 1000
    }

    const adapter = new LangGraphAdapter()
    const conclusion = (adapter as any).buildSuccessfulConclusion(state)

    // 1000 * 3.0 / 1e6 + 500 * 15.0 / 1e6
    expect(conclusion.estimatedCostUsd).toBeCloseTo(0.0105, 10)
  })

  it('is present and numeric on a failed build', () => {
    const state: ExecutionState = {
      question: 'q',
      plan,
      customVars: {},
      status: 'ERROR',
      outputs: { solo: output },
      executionOrder: ['solo'],
      startedAt: Date.now() - 1000,
      error: { message: 'boom' }
    }

    const adapter = new LangGraphAdapter()
    const conclusion = (adapter as any).buildFailedConclusion('boom', state)

    expect(conclusion.estimatedCostUsd).toBeCloseTo(0.0105, 10)
  })
})
