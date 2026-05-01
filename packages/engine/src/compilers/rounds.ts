import type { Agent, Plan, PlanConditionalEdge, PlanEdge, PlanGraph, PlanNode, RoundsWorkflow, Team } from '../types'
import { validateTemplate } from '../validate-template'

/**
 * Compiles a RoundsWorkflow team into a Plan with a pre-allocated
 * DAG. Revision loops are unrolled at compile time — no cycles in
 * the resulting graph.
 *
 * Structure for a workflow with:
 *   - R rounds
 *   - M non-terminal, non-audit agents (the "round agents")
 *   - terminal agent T
 *   - (optional) audit agents A1, A2, ... AN  (array or single string)
 *   - (optional) maxRevisions K (default 1)
 *
 * Without audit:
 *   [round agents in sequence] → terminal-0
 *   Entry: round-0-<first agent>
 *
 * With audit agents [A1, A2] and maxRevisions=K:
 *   [round agents] → terminal-0 → audit-A1-0 → audit-A2-0
 *   audit-A2-0 conditionally (anyOf A1-0, A2-0) → terminal-1 or __END__
 *   terminal-1 → audit-A1-1 → audit-A2-1
 *   audit-A2-1: no conditional edge (last slot)
 *
 * Audit node IDs use the scheme: audit-<AgentName>-<slotIndex>
 * This is consistent for both single and multi-auditor configs.
 *
 * Caller has validated:
 *   - workflow.type === 'rounds'
 *   - rounds >= 1
 *   - terminalAgent exists in team
 *   - each auditAgent, if set, exists in team and differs from terminalAgent
 *   - maxRevisions >= 0 if set
 */
export function compileRounds(params: { team: Team; workflow: RoundsWorkflow; question: string; model: string }): Plan {
  const { team, workflow, question, model } = params
  const rounds = workflow.rounds
  const terminalAgent = workflow.terminalAgent
  const messageTemplate = workflow.messageTemplate

  const hasAudit = 'auditAgent' in workflow && workflow.auditAgent !== undefined

  // Normalize auditAgent to array regardless of string | string[] form
  const auditAgentNames: string[] = hasAudit
    ? Array.isArray(workflow.auditAgent)
      ? workflow.auditAgent
      : [workflow.auditAgent]
    : []

  const auditTemplate = hasAudit ? workflow.auditTemplate : undefined
  const maxRevisions = hasAudit ? (workflow.maxRevisions ?? 1) : 0

  // Validate templates before building the graph
  validateTemplate(messageTemplate, 'round')
  validateTemplate(messageTemplate, 'terminal')
  if (hasAudit && auditTemplate !== undefined) {
    validateTemplate(auditTemplate, 'audit')
  }

  // Non-terminal, non-audit agents (the "round agents" that speak each round)
  const roundAgents = team.agents.filter((a) => a.name !== terminalAgent && !auditAgentNames.includes(a.name))

  if (roundAgents.length === 0) {
    throw new Error(`RoundsWorkflow requires at least one non-terminal, non-audit agent; team '${team.name}' has none`)
  }

  // Build agents map (all agents referenced in the graph)
  const agents: Record<string, Agent> = {}
  for (const agent of team.agents) {
    agents[agent.name] = agent
  }

  // Build nodes
  const nodes: Record<string, PlanNode> = {}
  const edges: PlanEdge[] = []
  const conditionalEdges: PlanConditionalEdge[] = []

  // Round agent nodes — R rounds * M agents
  // Node ids: round-{roundIndex}-{agentName}
  for (let r = 0; r < rounds; r++) {
    for (const agent of roundAgents) {
      const nodeId = `round-${r}-${agent.name}`
      nodes[nodeId] = {
        id: nodeId,
        agentName: agent.name,
        inputTemplate: messageTemplate,
        role: 'round',
        kind: 'parallel-peer',
        metadata: {
          roundIndex: r,
          totalRounds: rounds
        }
      }
    }
  }

  // Collect all round node ids in execution order (for later use)
  const allRoundNodeIds: string[] = []

  // Build allRoundNodeIds in execution order and create edges
  for (let r = 0; r < rounds; r++) {
    for (const agent of roundAgents) {
      allRoundNodeIds.push(`round-${r}-${agent.name}`)
    }
  }

  // Edges connecting round agents in sequence — LangGraph wiring, not semantic data flow
  for (let i = 0; i < allRoundNodeIds.length - 1; i++) {
    edges.push({ from: allRoundNodeIds[i]!, to: allRoundNodeIds[i + 1]!, kind: 'ordering' })
  }

  // Terminal nodes (0 through maxRevisions)
  // If no audit: only terminal-0
  // If audit: terminal-0 through terminal-maxRevisions
  const numTerminals = hasAudit ? maxRevisions + 1 : 1
  for (let k = 0; k < numTerminals; k++) {
    const nodeId = `terminal-${k}`
    nodes[nodeId] = {
      id: nodeId,
      agentName: terminalAgent,
      inputTemplate: messageTemplate,
      role: 'terminal',
      // terminal-0 is the primary synthesizer; terminal-1+ are pre-allocated revision slots
      kind: k === 0 ? 'synthesizer' : 'revision-terminal',
      metadata: {
        totalRounds: rounds,
        revisionIndex: k
      }
    }
  }

  // Edge from last round agent to terminal-0 — real data flow
  edges.push({
    from: allRoundNodeIds[allRoundNodeIds.length - 1]!,
    to: 'terminal-0',
    kind: 'flow'
  })

  // Add __END__ sentinel node (used for conditional edge exit paths)
  nodes.__END__ = {
    id: '__END__',
    agentName: '__END__',
    inputTemplate: '',
    role: 'solo',
    kind: 'system-sentinel',
    metadata: {}
  }

  // Audit flow (only if hasAudit)
  if (hasAudit && auditTemplate !== undefined && auditAgentNames.length > 0) {
    // For each revision slot k (0 through maxRevisions):
    //   Build one audit node per auditor: audit-<AgentName>-<k>
    //   Chain them sequentially within the slot
    //   Conditional edge from the LAST auditor: anyOf all audit nodes in the slot
    for (let k = 0; k <= maxRevisions; k++) {
      // Build audit nodes for this slot
      for (const auditName of auditAgentNames) {
        const nodeId = `audit-${auditName}-${k}`
        nodes[nodeId] = {
          id: nodeId,
          agentName: auditName,
          inputTemplate: auditTemplate,
          role: 'audit',
          kind: 'auditor',
          metadata: {
            revisionIndex: k
          }
        }
      }

      // Sequential edges within this slot: A1-k → A2-k → ... → AN-k (wiring, not semantic flow)
      for (let i = 0; i < auditAgentNames.length - 1; i++) {
        edges.push({
          from: `audit-${auditAgentNames[i]}-${k}`,
          to: `audit-${auditAgentNames[i + 1]}-${k}`,
          kind: 'ordering'
        })
      }
    }

    // Entry edges: terminal-k → first auditor in slot k (real data flow)
    const firstAuditName = auditAgentNames[0]!
    for (let k = 0; k < numTerminals; k++) {
      edges.push({ from: `terminal-${k}`, to: `audit-${firstAuditName}-${k}`, kind: 'flow' })
    }

    // Conditional edges: last auditor in slot k → terminal-(k+1) on revision, else __END__
    // Only for slots k < maxRevisions (the last slot has no outgoing conditional edge)
    const lastAuditName = auditAgentNames[auditAgentNames.length - 1]!
    for (let k = 0; k < maxRevisions; k++) {
      const allAuditNodeIdsInSlot = auditAgentNames.map((name) => `audit-${name}-${k}`)
      conditionalEdges.push({
        from: `audit-${lastAuditName}-${k}`,
        ifTrue: `terminal-${k + 1}`,
        ifFalse: '__END__',
        condition: {
          anyOf: allAuditNodeIdsInSlot,
          check: workflow.revisionCondition
        }
      })
    }

    // Final audit slot (audit-*-maxRevisions) has no conditional edge.
    // Execution ends there; adapter checks condition to determine
    // terminal state (MAX_REVISIONS vs CLEAN/REVISED).
  }

  const graph: PlanGraph = {
    nodes,
    edges,
    conditionalEdges,
    entryNode: allRoundNodeIds[0]!
  }

  return {
    schemaVersion: '1.0',
    question,
    model,
    agents,
    teamName: team.name,
    graph
  }
}
