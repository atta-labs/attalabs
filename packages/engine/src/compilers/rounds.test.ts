import { describe, expect, it } from 'vitest'
import { compile } from '../compile'
import type { Agent, RoundsWorkflow, Team } from '../types'

// Minimal agents for compile-time tests — no LLM calls involved.
const roundAgent: Agent = { name: 'RoundAgent', model: 'test', systemPrompt: 'Round.', tools: [] }
const terminal: Agent = { name: 'Terminal', model: 'test', systemPrompt: 'Terminal.', tools: [] }
const auditor: Agent = { name: 'Auditor', model: 'test', systemPrompt: 'Audit.', tools: [] }

const ROUND_TEMPLATE = '{{question}}'
const AUDIT_TEMPLATE = '{{question}}'

// ─── RoundsWorkflowNoAudit ────────────────────────────────────────────────────

describe('RoundsWorkflowNoAudit compile', () => {
  const workflow: RoundsWorkflow = {
    type: 'rounds',
    rounds: 1,
    messageTemplate: ROUND_TEMPLATE,
    terminalAgent: 'Terminal'
  }

  const team: Team = {
    name: 'TestTeam',
    agents: [roundAgent, terminal],
    workflow
  }

  it('produces only round and terminal nodes — no audit nodes', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const nodeIds = Object.keys(plan.graph.nodes)
    expect(nodeIds).toContain('round-0-RoundAgent')
    expect(nodeIds).toContain('terminal-0')
    expect(nodeIds).toContain('__END__')
    expect(nodeIds.filter((id) => id.startsWith('audit-'))).toHaveLength(0)
  })

  it('has no conditional edges', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.conditionalEdges).toHaveLength(0)
  })

  it('sets workflowType to rounds', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.workflowType).toBe('rounds')
  })

  it('entry node is the first round agent', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.entryNode).toBe('round-0-RoundAgent')
  })
})

// ─── RoundsWorkflowWithAudit, maxRevisions: 0 ────────────────────────────────

describe('RoundsWorkflowWithAudit maxRevisions:0 compile', () => {
  const workflow: RoundsWorkflow = {
    type: 'rounds',
    rounds: 1,
    messageTemplate: ROUND_TEMPLATE,
    terminalAgent: 'Terminal',
    auditAgent: 'Auditor',
    auditTemplate: AUDIT_TEMPLATE,
    revisionCondition: { type: 'contains', value: 'FLAG', caseSensitive: false },
    maxRevisions: 0
  }

  const team: Team = {
    name: 'TestTeam',
    agents: [roundAgent, terminal, auditor],
    workflow
  }

  it('produces exactly one terminal node and one audit node', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const nodeIds = Object.keys(plan.graph.nodes)
    expect(nodeIds).toContain('terminal-0')
    expect(nodeIds).not.toContain('terminal-1')
    expect(nodeIds).toContain('audit-Auditor-0')
    expect(nodeIds).not.toContain('audit-Auditor-1')
  })

  it('has no conditional edges — no revision slot exists', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.conditionalEdges).toHaveLength(0)
  })

  it('edges: round → terminal-0 → audit-Auditor-0', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    const edges = plan.graph.edges.map((e) => `${e.from}→${e.to}`)
    expect(edges).toContain('round-0-RoundAgent→terminal-0')
    expect(edges).toContain('terminal-0→audit-Auditor-0')
  })

  it('audit node has role audit', () => {
    const plan = compile({ team, question: 'Q', model: 'test' })
    expect(plan.graph.nodes['audit-Auditor-0']?.role).toBe('audit')
  })
})
