import type { Plan, PlanGraph, PlanNode, Team } from '../types'

/**
 * Compiles a SoloWorkflow team into a Plan with a single node.
 * No edges. No conditional edges. The one node is both entry and
 * terminal.
 *
 * Caller (compile()) has already validated:
 *   - team has exactly 1 agent
 *   - workflow.type === 'solo'
 */
export function compileSolo(params: { team: Team; question: string; model: string }): Plan {
  const { team, question, model } = params
  const agent = team.agents[0]!

  // Solo has no template; the agent's systemPrompt + question is enough.
  // Use a minimal pass-through template that emits the question verbatim.
  const node: PlanNode = {
    id: 'solo',
    agentName: agent.name,
    inputTemplate: '{{question}}',
    role: 'solo',
    kind: 'solo-agent',
    metadata: {}
  }

  const graph: PlanGraph = {
    nodes: { solo: node },
    edges: [],
    conditionalEdges: [],
    entryNode: 'solo'
  }

  const agents: Record<string, typeof agent> = { [agent.name]: agent }

  return {
    schemaVersion: '1.0',
    question,
    model,
    agents,
    teamName: team.name,
    graph
  }
}
