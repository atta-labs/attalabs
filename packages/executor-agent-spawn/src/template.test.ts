import { describe, expect, it } from 'bun:test'
import type { PlanAgentSpawnNode } from '@atta/engine'
import { renderStepPrompt } from './template'

const node: PlanAgentSpawnNode = {
  id: 'review',
  role: 'agent-spawn',
  kind: 'agent-spawn',
  promptTemplate: 'Question: {{question}}\nPrior exit code: {{results.implement.exitCode}}',
  agentRole: 'reviewer',
  permission: 'default',
  workingDirectory: '/tmp',
  maxTurns: 5,
  metadata: {}
}

describe('renderStepPrompt', () => {
  it('renders the question and a prior node result into the prompt', () => {
    const rendered = renderStepPrompt(node, {
      question: 'Ship the feature',
      results: { implement: { nodeId: 'implement', kind: 'agent-spawn', events: [], exitCode: 0, durationMs: 10 } }
    })

    expect(rendered).toBe('Question: Ship the feature\nPrior exit code: 0')
  })

  it('throws naming the node id when the template is malformed', () => {
    const brokenNode: PlanAgentSpawnNode = { ...node, promptTemplate: '{{#each}}' }

    expect(() => renderStepPrompt(brokenNode, { question: 'x', results: {} })).toThrow(
      /Prompt template rendering failed for node 'review'/
    )
  })
})
