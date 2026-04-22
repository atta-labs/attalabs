import type { Agent, Plan, PlanConditionalEdge, PlanEdge, PlanGraph, PlanNode, RoundsWorkflow, Team } from '../types.js'
import { validateTemplate } from '../validate-template.js'

/**
 * Compiles a RoundsWorkflow team into a Plan with a pre-allocated
 * DAG. Revision loops are unrolled at compile time — no cycles in
 * the resulting graph.
 *
 * Structure for a workflow with:
 *   - R rounds
 *   - M non-terminal, non-audit agents
 *   - terminal agent T
 *   - (optional) audit agent A
 *   - (optional) maxRevisions K (default 1)
 *
 * The graph contains:
 *   Round agents: R * M nodes (round-0-A, round-0-B, ..., round-R-1-M)
 *   Terminal nodes: K + 1 nodes (terminal-0 through terminal-K)
 *   Audit nodes: K + 1 nodes (audit-0 through audit-K)  [only if auditAgent]
 *
 * Without audit:
 *   [round agents in sequence] → terminal-0
 *   Entry: round-0-<first agent>
 *
 * With audit and maxRevisions=K:
 *   [round agents] → terminal-0 → audit-0
 *   audit-0 conditionally → terminal-1 (on REVISE) or __END__
 *   terminal-1 → audit-1
 *   audit-1 conditionally → terminal-2 (on REVISE) or __END__
 *   ...
 *   terminal-K → audit-K  [audit-K has no outgoing edges]
 *
 * Caller has validated:
 *   - workflow.type === 'rounds'
 *   - rounds >= 1
 *   - terminalAgent exists in team
 *   - auditAgent, if set, exists in team and differs from terminalAgent
 *   - maxRevisions >= 0 if set
 */
export function compileRounds(params: { team: Team; workflow: RoundsWorkflow; question: string; model: string }): Plan {
  const { team, workflow, question, model } = params
  const rounds = workflow.rounds
  const terminalAgent = workflow.terminalAgent
  const messageTemplate = workflow.messageTemplate

  const hasAudit = 'auditAgent' in workflow && workflow.auditAgent !== undefined
  const auditAgent = hasAudit ? workflow.auditAgent : undefined
  const auditTemplate = hasAudit ? workflow.auditTemplate : undefined
  const maxRevisions = hasAudit ? (workflow.maxRevisions ?? 1) : 0

  // Validate templates before building the graph
  validateTemplate(messageTemplate, 'round')
  validateTemplate(messageTemplate, 'terminal')
  if (hasAudit && auditTemplate !== undefined) {
    validateTemplate(auditTemplate, 'audit')
  }

  // Non-terminal, non-audit agents (the "round agents" that speak each round)
  const roundAgents = team.agents.filter((a) => a.name !== terminalAgent && (!hasAudit || a.name !== auditAgent))

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

  // Edges connecting round agents in sequence
  for (let i = 0; i < allRoundNodeIds.length - 1; i++) {
    edges.push({ from: allRoundNodeIds[i]!, to: allRoundNodeIds[i + 1]! })
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
      metadata: {
        totalRounds: rounds,
        revisionIndex: k,
        isRevision: k > 0
      }
    }
  }

  // Edge from last round agent to terminal-0
  edges.push({
    from: allRoundNodeIds[allRoundNodeIds.length - 1]!,
    to: 'terminal-0'
  })

  // Add __END__ sentinel node (used for conditional edge exit paths)
  nodes['__END__'] = {
    id: '__END__',
    agentName: '__END__',
    inputTemplate: '',
    role: 'solo',
    metadata: {}
  }

  // Audit flow (only if hasAudit)
  if (hasAudit) {
    const auditAgentName = auditAgent!
    const auditTemplateName = auditTemplate!

    // Audit nodes 0 through maxRevisions
    for (let k = 0; k <= maxRevisions; k++) {
      const nodeId = `audit-${k}`
      nodes[nodeId] = {
        id: nodeId,
        agentName: auditAgentName,
        inputTemplate: auditTemplateName,
        role: 'audit',
        metadata: {
          revisionIndex: k
        }
      }
    }

    // Terminal-k → Audit-k for each k
    for (let k = 0; k < numTerminals; k++) {
      edges.push({ from: `terminal-${k}`, to: `audit-${k}` })
    }

    // Conditional edges: audit-k → terminal-(k+1) on REVISE, else __END__
    for (let k = 0; k < maxRevisions; k++) {
      conditionalEdges.push({
        from: `audit-${k}`,
        ifTrue: `terminal-${k + 1}`,
        ifFalse: '__END__',
        condition: {
          targetNode: `audit-${k}`,
          check: workflow.revisionCondition
        }
      })
    }

    // Final audit node (audit-maxRevisions) has no conditional edge.
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
    workflowType: 'rounds',
    graph
  }
}
