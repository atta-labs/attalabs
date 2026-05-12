import { describe, it, expect } from 'bun:test'
import type { AgentOutput, ExecutionHooks, LlmCallFn, Plan, PlanNode } from '@atta/engine'
import { createNodeExecutor } from './node-executor'
import type { VadaGraphStateValue } from './graph-state'

const testPlan: Plan = {
  schemaVersion: '1.0',
  question: 'test question',
  model: 'claude-sonnet-4-6',
  agents: {
    Gemini: {
      name: 'Gemini',
      description: 'test reviewer',
      systemPrompt: 'You are a reviewer.',
      model: 'gemini-2.5-pro'
    }
  },
  teamName: 'Reviewers',
  graph: {
    nodes: {
      'solo-Gemini-0': {
        id: 'solo-Gemini-0',
        agentName: 'Gemini',
        inputTemplate: '{{question}}',
        role: 'solo',
        kind: 'solo-agent',
        metadata: {}
      }
    },
    edges: [],
    conditionalEdges: [],
    entryNode: 'solo-Gemini-0'
  }
}

const testNode: PlanNode = testPlan.graph.nodes['solo-Gemini-0']!

const baseGraphState: VadaGraphStateValue = {
  question: 'test question',
  customVars: {},
  outputs: {},
  executionOrder: [],
  toolDecisions: {},
  toolUseHistory: [],
  status: 'RUNNING',
  error: undefined,
  startedAt: Date.now()
}

describe('createNodeExecutor — error handling', () => {
  it('calls onNodeComplete with error output when llmCall throws', async () => {
    const throwingLlmCall: LlmCallFn = async () => {
      throw new Error("No API key configured for vendor 'openai'")
    }

    let capturedOutput: AgentOutput | undefined
    const hooks: ExecutionHooks = {
      onNodeComplete: async ({ output }) => {
        capturedOutput = output
      }
    }

    const executor = createNodeExecutor(throwingLlmCall, hooks)
    await executor(baseGraphState, { node: testNode, plan: testPlan })

    expect(capturedOutput).toBeDefined()
    expect(capturedOutput!.error).toContain("No API key configured for vendor 'openai'")
    expect(capturedOutput!.agentName).toBe('Gemini')
    expect(capturedOutput!.content).toBe('')
  })
})
