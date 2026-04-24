import type { BrokeredWorkflow, Plan, PlanEdge, PlanGraph, PlanNode, Team } from '../types'
import { validateTemplate } from '../validate-template'

/**
 * Compiles a BrokeredWorkflow into a sequential Plan.
 *
 * Each reviewer becomes an independent solo-role node. Reviewers run
 * sequentially with no cross-reviewer context. No audit, no revision.
 *
 * Node IDs: reviewer-{agentName}
 * Entry: reviewer-{first reviewer agentName}
 *
 * Graph shape (3 reviewers):
 *   reviewer-Strategist → reviewer-Critic → reviewer-DevilsAdvocate
 *
 * Caller has validated:
 *   - workflow.type === 'brokered'
 *   - reviewers.length >= 2
 *   - reviewers.length <= 5
 *   - each reviewer.agentName exists in team.agents
 *   - each reviewer.messageTemplate is non-empty
 */
export function compileBrokered(params: {
  team: Team
  workflow: BrokeredWorkflow
  question: string
  model: string
}): Plan {
  const { team, workflow, question, model } = params

  const nodes: Record<string, PlanNode> = {}
  const edges: PlanEdge[] = []

  for (const reviewer of workflow.reviewers) {
    validateTemplate(reviewer.messageTemplate, 'solo')

    const nodeId = `reviewer-${reviewer.agentName}`
    nodes[nodeId] = {
      id: nodeId,
      agentName: reviewer.agentName,
      inputTemplate: reviewer.messageTemplate,
      role: 'solo',
      metadata: {}
    }
  }

  // Sequential edges between reviewers
  for (let i = 0; i < workflow.reviewers.length - 1; i++) {
    edges.push({
      from: `reviewer-${workflow.reviewers[i]!.agentName}`,
      to: `reviewer-${workflow.reviewers[i + 1]!.agentName}`
    })
  }

  const graph: PlanGraph = {
    nodes,
    edges,
    conditionalEdges: [],
    entryNode: `reviewer-${workflow.reviewers[0]!.agentName}`
  }

  const agentsMap: Record<string, (typeof team.agents)[0]> = {}
  for (const agent of team.agents) {
    agentsMap[agent.name] = agent
  }

  return {
    schemaVersion: '1.0',
    question,
    model,
    agents: agentsMap,
    teamName: team.name,
    workflowType: 'brokered',
    graph
  }
}
