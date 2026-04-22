import { StateGraph } from '@langchain/langgraph'
import type { Plan, PlanNode } from '@atta/engine'
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
    let targetId: string
    if (edge.to === '__END__') {
      targetId = '__end__'
    } else {
      targetId = edge.to
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(graph as any).addEdge(edge.from, targetId)
  }

  // Add conditional edges
  for (const condEdge of plan.graph.conditionalEdges) {
    const routerFn = (_: VadaGraphStateValue): string => {
      // Stub: always returns the ifFalse path (no revision)
      // Phase 2 Task 4 will implement the actual condition evaluation
      return condEdge.ifFalse
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(graph as any).addConditionalEdges(condEdge.from, routerFn, {
      [condEdge.ifTrue]: condEdge.ifTrue,
      [condEdge.ifFalse]: condEdge.ifFalse
    })
  }
  // Set entry point: connect START to the first node in the plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(graph as any).addEdge('__start__', plan.graph.entryNode)

  // Compile and return
  return graph.compile()
}
