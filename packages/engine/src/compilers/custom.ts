import type { CustomWorkflow, Plan, PlanEdge, PlanGraph, PlanNode, Team } from '../types.js'
import { validateTemplate } from '../validate-template.js'

/**
 * Compiles a CustomWorkflow team into a Plan with one node per step.
 * Nodes are connected in sequence (step-0 → step-1 → ... → step-N).
 *
 * Caller has validated:
 *   - workflow.type === 'custom'
 *   - config.steps non-empty
 *   - every step.agent exists in team.agents
 */
export function compileCustom(params: { team: Team; workflow: CustomWorkflow; question: string; model: string }): Plan {
  const { team, workflow, question, model } = params
  const { steps } = workflow.config

  // Build agents map (unique agents referenced across steps)
  const agents: Record<string, (typeof team.agents)[number]> = {}
  for (const agent of team.agents) {
    agents[agent.name] = agent
  }

  // Build nodes (one per step)
  const nodes: Record<string, PlanNode> = {}
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    validateTemplate(step.input, 'custom-step')
    const nodeId = `step-${i}`
    nodes[nodeId] = {
      id: nodeId,
      agentName: step.agent,
      inputTemplate: step.input,
      role: 'custom-step',
      metadata: {
        customStepIndex: i
      }
    }
  }

  // Build edges (sequential chain: step-0 → step-1 → ... → step-(N-1))
  const edges: PlanEdge[] = []
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      from: `step-${i}`,
      to: `step-${i + 1}`
    })
  }

  const graph: PlanGraph = {
    nodes,
    edges,
    conditionalEdges: [],
    entryNode: 'step-0'
  }

  return {
    schemaVersion: '1.0',
    question,
    model,
    agents,
    teamName: team.name,
    workflowType: 'custom',
    graph
  }
}
