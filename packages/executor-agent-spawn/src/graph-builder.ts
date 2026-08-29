/**
 * @file graph-builder.ts
 * @description This package's own Plan → StateGraph translation. Not
 * `buildStateGraph` from `packages/adapter-langgraph` — that function binds
 * to `VadaGraphState`, takes a meaningless-here `apiKey` parameter, and
 * structurally injects a classifier node before every tool-enabled node.
 * An agent-lifecycle Plan has no rounds, no tools, no classifier.
 *
 * Node ids and the sequential edge chain come straight from `@atta/engine`'s
 * `compileSteps` — a linear walk of `plan.graph.edges`, terminal nodes wired
 * to `END`. No conditional edges exist in this shape (`plan.graph.entryNode`
 * and `plan.graph.conditionalEdges` are the only other fields it sets, and
 * the latter is always empty here).
 */

import { END, StateGraph } from '@langchain/langgraph'
import type { Plan, PlanNode } from '@atta/engine'
import { AgentSpawnGraphState, type AgentSpawnGraphStateValue } from './graph-state'
import { executeMechanicalNode } from './mechanical-executor'
import { executeAgentSpawnNode, type SpawnFn } from './node-executor'
import { renderStepPrompt } from './template'
import type { AgentSpawnExecutorConfig } from './types'

/** Context passed to a per-node executor: the node itself and its owning Plan. */
export interface NodeExecutionContext {
  node: PlanNode
  plan: Plan
}

export type AgentLifecycleNodeExecutor = (
  state: AgentSpawnGraphStateValue,
  context: NodeExecutionContext
) => Promise<Partial<AgentSpawnGraphStateValue>>

/**
 * Builds the node executor wired into every node of the translated graph.
 * Dispatches on `node.kind` to this package's two node kinds: `agent-spawn`
 * (spawns an agent process and captures its event stream) and `mechanical`
 * (runs a configured command, no model turn at all). Every other kind is
 * refused — this package executes steps-shaped Plans only.
 *
 * Both branches record their result the same way: through the returned
 * partial state, which LangGraph passes to the annotation's keyed-merge
 * reducer. Neither writes into `state` directly, or concurrent nodes would
 * race and lose each other's writes.
 *
 * This function is also the executor's single emission path: it calls
 * `config.onEvent` (see `types.ts`) around whichever branch it dispatches
 * to, so `node:start` / `node:complete` / `node:failed` are ordered by this
 * function's own control flow rather than by two node-kind implementations
 * each deciding independently when to report themselves. An agent-spawn
 * node's captured event stream is additionally surfaced as `node:streaming`
 * — what the spawned process reported — between `node:start` and
 * `node:complete`; a mechanical node has no such stream, so it only ever
 * produces the two lifecycle events.
 */
export function createAgentLifecycleNodeExecutor(
  config: AgentSpawnExecutorConfig,
  spawnFn?: SpawnFn
): AgentLifecycleNodeExecutor {
  return async (state, { node, plan }) => {
    const { onEvent } = config
    const { runId } = state
    onEvent?.({ type: 'node:start', nodeId: node.id, runId })

    try {
      if (node.kind === 'mechanical') {
        const result = await executeMechanicalNode({ node, config, spawnFn })
        onEvent?.({ type: 'node:complete', nodeId: node.id, runId })
        // No `sessions` write: a mechanical node has no model turn and so no
        // session for a later step's `resume` to look up.
        return {
          results: { [node.id]: result },
          revisionCounts: { [node.id]: (state.revisionCounts[node.id] ?? 0) + 1 }
        }
      }
      if (node.kind !== 'agent-spawn') {
        throw new Error(
          `Unsupported node kind '${node.kind}' for node '${node.id}' — this package only executes 'agent-spawn' and 'mechanical' steps.`
        )
      }

      const resumeSessionId = node.resume ? state.sessions[node.resume] : undefined
      if (node.resume && !resumeSessionId) {
        throw new Error(
          `Agent-spawn node '${node.id}' declares resume: '${node.resume}', but no session id has been recorded for it yet.`
        )
      }

      const prompt = renderStepPrompt(node, { question: plan.question, results: state.results })
      const result = await executeAgentSpawnNode({ node, prompt, resumeSessionId, config, spawnFn })

      if (onEvent) {
        for (const reported of result.events) {
          const content = typeof reported === 'string' ? reported : JSON.stringify(reported)
          onEvent({ type: 'node:streaming', nodeId: node.id, runId, content })
        }
      }
      onEvent?.({ type: 'node:complete', nodeId: node.id, runId })

      return {
        results: { [node.id]: result },
        sessions: result.sessionId ? { [node.id]: result.sessionId } : {},
        revisionCounts: { [node.id]: (state.revisionCounts[node.id] ?? 0) + 1 }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      onEvent?.({ type: 'node:failed', nodeId: node.id, runId, error })
      throw err
    }
  }
}

/**
 * Translates a compiled agent-lifecycle Plan into a compiled LangGraph
 * StateGraph. One graph node per Plan node (id preserved verbatim), the
 * Plan's sequential `flow` edges reproduced as-is, terminal nodes (no
 * outgoing edge) wired to `END`, and `plan.graph.entryNode` wired as the
 * graph's start.
 */
export function buildAgentSpawnStateGraph(plan: Plan, executor: AgentLifecycleNodeExecutor) {
  const graph = new StateGraph(AgentSpawnGraphState)

  for (const [nodeId, node] of Object.entries(plan.graph.nodes)) {
    graph.addNode(nodeId, async (state: AgentSpawnGraphStateValue) => executor(state, { node, plan }))
  }

  for (const edge of plan.graph.edges) {
    // LangGraph's addNode/addEdge typings require string-literal node names
    // known at compile time; this package wires an arbitrary Plan's runtime
    // node ids, so the cast is required at every edge call site.
    ;(graph as unknown as { addEdge: (from: string, to: string) => void }).addEdge(edge.from, edge.to)
  }

  const nodesWithOutgoingEdge = new Set(plan.graph.edges.map((edge) => edge.from))
  for (const nodeId of Object.keys(plan.graph.nodes)) {
    if (!nodesWithOutgoingEdge.has(nodeId)) {
      ;(graph as unknown as { addEdge: (from: string, to: typeof END) => void }).addEdge(nodeId, END)
    }
  }

  ;(graph as unknown as { addEdge: (from: string, to: string) => void }).addEdge('__start__', plan.graph.entryNode)

  return graph.compile()
}
