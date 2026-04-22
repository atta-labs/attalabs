import { END, StateGraph } from '@langchain/langgraph'
import type { AgentOutput, Plan, PlanNode, RevisionCondition } from '@atta/engine'
import { VadaGraphState, type VadaGraphStateValue } from './graph-state'

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
 * @param plan The compiled Plan to translate.
 * @param executor The async function that executes each plan node.
 * @returns A compiled StateGraph ready for invocation.
 */
export function buildStateGraph(plan: Plan, executor: NodeExecutor) {
  const graph = new StateGraph(VadaGraphState)

  // Add nodes for each plan node (skip __END__ sentinel)
  for (const nodeId of Object.keys(plan.graph.nodes)) {
    if (nodeId === '__END__') continue

    const node = plan.graph.nodes[nodeId]!
    graph.addNode(nodeId, async (state: VadaGraphStateValue) => {
      return executor(state, { node, plan })
    })
  }

  // Add unconditional edges
  for (const edge of plan.graph.edges) {
    const toTarget = edge.to === '__END__' ? END : edge.to
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(graph as any).addEdge(edge.from, toTarget)
  }

  // Add conditional edges
  for (const condEdge of plan.graph.conditionalEdges) {
    const ifTrueTarget = condEdge.ifTrue === '__END__' ? END : condEdge.ifTrue
    const ifFalseTarget = condEdge.ifFalse === '__END__' ? END : condEdge.ifFalse

    const routerFn = (state: VadaGraphStateValue): string => {
      // Task 5: Evaluate RevisionCondition against target node's output
      const targetOutput = state.outputs[condEdge.condition.targetNode]
      if (!targetOutput) {
        return ifFalseTarget
      }

      const conditionMet = evaluateRevisionCondition(condEdge.condition.check, targetOutput)
      return conditionMet ? ifTrueTarget : ifFalseTarget
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(graph as any).addConditionalEdges(condEdge.from, routerFn, {
      [ifTrueTarget]: ifTrueTarget,
      [ifFalseTarget]: ifFalseTarget
    })
  }
  // Set entry point: connect START to the first node in the plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(graph as any).addEdge('__start__', plan.graph.entryNode)

  // Compile and return
  return graph.compile()
}
