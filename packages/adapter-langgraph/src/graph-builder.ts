import { END, StateGraph } from '@langchain/langgraph'
import type { AgentOutput, Plan, PlanNode, RevisionCondition } from '@atta/engine'
import { VadaGraphState, type VadaGraphStateValue } from './graph-state'
import { createClassifierNode } from './cognitive-router/classifier'

/**
 * Runtime context passed to a node executor function.
 */
export interface NodeExecutionContext {
  /** The PlanNode being executed. */
  node: PlanNode
  /** The full Plan being executed. */
  plan: Plan
}

/**
 * Async function that executes a single node in the graph.
 * Receives the current state and node context, returns partial state updates.
 */
export type NodeExecutor = (
  state: VadaGraphStateValue,
  context: NodeExecutionContext
) => Promise<Partial<VadaGraphStateValue>>

/**
 * Evaluates a RevisionCondition against an agent's output.
 * Returns true if the condition is satisfied (triggers revision), false otherwise.
 */
function evaluateRevisionCondition(condition: RevisionCondition, output: AgentOutput): boolean {
  switch (condition.type) {
    case 'contains': {
      const searchStr = condition.value
      const contentStr = output.content
      const caseSensitive = condition.caseSensitive ?? true
      if (caseSensitive) {
        return contentStr.includes(searchStr)
      }
      return contentStr.toLowerCase().includes(searchStr.toLowerCase())
    }

    case 'json-field-equals': {
      if (!output.structured) return false
      const value = getJsonField(output.structured, condition.path)
      return value === condition.value
    }

    case 'json-field-truthy': {
      if (!output.structured) return false
      const value = getJsonField(output.structured, condition.path)
      return Boolean(value)
    }
  }
}

/**
 * Extract a value from a JSON object using dot-notation path.
 * Example: getJsonField({ result: { verdict: 'yes' } }, 'result.verdict') => 'yes'
 */
function getJsonField(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Builds a compiled LangGraph StateGraph from a Vāda Plan.
 *
 * Translates the Plan's DAG (nodes + edges + conditionalEdges) into a StateGraph
 * that LangGraph can invoke. Each node in the plan becomes a node function that
 * calls the provided executor.
 *
 * When apiKey is provided, the cognitive router is enabled: a fast Haiku-based
 * classifier node is injected before every tool-enabled agent node to decide
 * which tools are actually needed for the current question. Edges to tool-enabled
 * nodes are rewired through their corresponding classifier nodes.
 *
 * @param plan The compiled Plan to translate.
 * @param executor The async function that executes each plan node.
 * @param apiKey Optional Anthropic API key. Enables cognitive router when present.
 * @returns A compiled StateGraph ready for invocation.
 */
export function buildStateGraph(plan: Plan, executor: NodeExecutor, apiKey?: string) {
  const graph = new StateGraph(VadaGraphState)

  // Identify tool-enabled agent nodes (those whose agents declare at least one tool)
  const toolEnabledNodes = new Set<string>()
  for (const nodeId of Object.keys(plan.graph.nodes)) {
    if (nodeId === '__END__') continue
    const node = plan.graph.nodes[nodeId]!
    const agent = plan.agents[node.agentName]
    if (agent?.tools && agent.tools.length > 0) {
      toolEnabledNodes.add(nodeId)
    }
  }

  // Add nodes for each plan node (skip __END__ sentinel)
  for (const nodeId of Object.keys(plan.graph.nodes)) {
    if (nodeId === '__END__') continue

    const node = plan.graph.nodes[nodeId]!
    graph.addNode(nodeId, async (state: VadaGraphStateValue) => {
      return executor(state, { node, plan })
    })
  }

  // Inject classifier nodes before each tool-enabled agent node.
  // classifier-{nodeId} → nodeId (fixed edge added here; incoming edges rewired below).
  if (apiKey) {
    for (const nodeId of toolEnabledNodes) {
      const node = plan.graph.nodes[nodeId]!
      const agent = plan.agents[node.agentName]!
      const classifierNodeId = `classifier-${nodeId}`
      const agentClassifierMode = plan.classifierModes?.[agent.name]
      graph.addNode(classifierNodeId, createClassifierNode(nodeId, agent, apiKey, agentClassifierMode))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(graph as any).addEdge(classifierNodeId, nodeId)
    }
  }

  // Resolve a plan-level destination to its actual LangGraph target,
  // redirecting tool-enabled nodes through their classifier when active.
  const resolveTarget = (target: string): string => {
    if (target === '__END__') return END
    if (apiKey && toolEnabledNodes.has(target)) return `classifier-${target}`
    return target
  }

  // Add unconditional edges (rewired through classifiers where applicable)
  for (const edge of plan.graph.edges) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(graph as any).addEdge(edge.from, resolveTarget(edge.to))
  }

  // Add conditional edges (ifTrue/ifFalse targets are terminal or __END__ — non-tool-enabled)
  for (const condEdge of plan.graph.conditionalEdges) {
    const ifTrueTarget = resolveTarget(condEdge.ifTrue)
    const ifFalseTarget = resolveTarget(condEdge.ifFalse)

    const routerFn = (state: VadaGraphStateValue): string => {
      let conditionMet: boolean
      if ('anyOf' in condEdge.condition) {
        // Any matching node output triggers the condition
        conditionMet = condEdge.condition.anyOf.some((nodeId) => {
          const output = state.outputs[nodeId]
          if (!output) return false
          return evaluateRevisionCondition(condEdge.condition.check, output)
        })
      } else {
        const targetOutput = state.outputs[condEdge.condition.targetNode]
        if (!targetOutput) return ifFalseTarget
        conditionMet = evaluateRevisionCondition(condEdge.condition.check, targetOutput)
      }
      return conditionMet ? ifTrueTarget : ifFalseTarget
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(graph as any).addConditionalEdges(condEdge.from, routerFn, {
      [ifTrueTarget]: ifTrueTarget,
      [ifFalseTarget]: ifFalseTarget
    })
  }
  // Set entry point: connect START to first node (through classifier if tool-enabled)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(graph as any).addEdge('__start__', resolveTarget(plan.graph.entryNode))

  // Compile and return
  return graph.compile()
}
