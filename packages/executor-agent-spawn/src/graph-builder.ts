/**
 * @file graph-builder.ts
 * @description This package's own Plan → StateGraph translation. Not
 * `buildStateGraph` from `packages/adapter-langgraph` — that function binds
 * to `VadaGraphState`, takes a meaningless-here `apiKey` parameter, and
 * structurally injects a classifier node before every tool-enabled node.
 * An agent-lifecycle Plan has no rounds, no tools, no classifier.
 *
 * Node ids come straight from `@atta/engine`'s `compileSteps`, and so does
 * the sequential edge chain in `plan.graph.edges` — but that chain is only
 * ever the *default* outgoing route for a node. A node whose
 * `plan.graph.nodes[nodeId].decision` is set (task 2's own surface) gets its
 * outgoing routing wired with `addConditionalEdges` instead, and that node's
 * entry in `plan.graph.edges` (which `compileSteps` still emits
 * unconditionally, decision or not) is skipped rather than also wired as a
 * plain edge — the decision is the only routing authority for that node.
 * `plan.graph.conditionalEdges` stays out of scope here: that field is
 * rounds-shape-only and is always empty for this Plan shape (task 1's own
 * finding, confirmed again for this task) — routing reads `node.decision`
 * exclusively, never that array. Because a decision's `ifTrue` can route
 * back to an earlier node, this graph is not assumed acyclic anywhere below.
 *
 * Fan-out and join (`engine-parallel-steps-v1` task 2) need no code of
 * their own here. A step several others each name as their sole
 * `dependsOn` compiles (task 1, `@atta/engine`) to several `PlanEdge`s
 * sharing one `from` — the edge-replay loop below already calls `addEdge`
 * once per edge, so fan-out falls straight out of it. A step naming several
 * dependencies compiles to several edges sharing one `to` — several
 * `addEdge` calls into the same node id, which is already how LangGraph
 * joins: a node with multiple declared incoming edges runs once, only
 * after every one of them has fired, native Pregel behavior this file does
 * not re-implement. "Fail the join" falls out the same way, with no new
 * state: a branch node's own failure already throws inside
 * `createAgentLifecycleNodeExecutor`'s `catch` block, which rejects the
 * whole `graph.compile().invoke()` call before the join node's turn can
 * ever come up in the traversal — the join's result is simply never
 * recorded, so it can never read as a pass. See
 * `graph-builder.test.ts`'s `'buildAgentSpawnStateGraph — fan-out and join
 * topology'` suite for the real proof (concurrent branch execution via
 * interleaved events, the join running exactly once, and a branch failure
 * rejecting `invoke()` with the join never starting).
 */

import { END, StateGraph } from '@langchain/langgraph'
import type { Plan, PlanNode, PlanStepDecision } from '@atta/engine'
import { AgentSpawnGraphState, type AgentSpawnGraphStateValue } from './graph-state'
import { executeMechanicalNode } from './mechanical-executor'
import { executeAgentSpawnNode, type SpawnFn } from './node-executor'
import { renderStepPrompt } from './template'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, StepNodeResult } from './types'

/**
 * Calls `onEvent`, if supplied, and swallows anything it throws. An
 * observer's own bug must never corrupt the run it is merely watching — an
 * unguarded call site would let a throwing callback masquerade the node's
 * real success as a failure (caught by the wrapper's own `try`/`catch`,
 * discarding the real result) or replace the real error a `catch` block is
 * already reporting.
 */
function safeEmit(onEvent: ((event: AgentLifecycleEvent) => void) | undefined, event: AgentLifecycleEvent): void {
  if (!onEvent) return
  try {
    onEvent(event)
  } catch {
    // Deliberately swallowed — see the function doc above.
  }
}

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
    safeEmit(onEvent, { type: 'node:start', nodeId: node.id, runId })

    try {
      if (node.kind === 'mechanical') {
        const result = await executeMechanicalNode({ node, config, spawnFn })
        safeEmit(onEvent, { type: 'node:complete', nodeId: node.id, runId })
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

      for (const reported of result.events) {
        const content = typeof reported === 'string' ? reported : JSON.stringify(reported)
        safeEmit(onEvent, { type: 'node:streaming', nodeId: node.id, runId, content })
      }
      safeEmit(onEvent, { type: 'node:complete', nodeId: node.id, runId })

      return {
        results: { [node.id]: result },
        sessions: result.sessionId ? { [node.id]: result.sessionId } : {},
        revisionCounts: { [node.id]: (state.revisionCounts[node.id] ?? 0) + 1 }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      safeEmit(onEvent, { type: 'node:failed', nodeId: node.id, runId, error })
      throw err
    }
  }
}

/** The three routes a decision's path function can resolve to — see `buildDecisionPathFn`. */
type DecisionRoute = 'ifTrue' | 'ifFalse' | 'exhausted'

/**
 * Builds the `addConditionalEdges` path function for one decision-bearing
 * node. Runs after that node's own execution has already merged into
 * `state` (LangGraph applies a node's returned partial state via the
 * annotation's reducer before routing its outgoing edge), so
 * `state.results[decision.examine]` is guaranteed present whether `examine`
 * names an earlier node or this node's own id.
 *
 * Never evaluates the condition itself — always defers to
 * `config.decisionPredicates[nodeId]`, the caller-supplied predicate. Two
 * failure shapes are refused identically, per this task's own trap: no
 * predicate configured for a node that declares a `decision`, and a
 * predicate that throws while evaluating. Neither silently defaults to
 * `ifFalse`/`ifTrue` — both throw a clear, named error and additionally
 * report it as a `node:failed` event (reusing that event's existing shape:
 * this is a post-completion routing failure, not a second kind of node
 * failure, and no other emitted event shape fits it better — see the PR
 * body for why this shape was chosen over a new event variant).
 *
 * The ceiling applies to **whichever** target the predicate resolves to —
 * `ifTrue` and `ifFalse` alike — because `@atta/engine`'s validator only
 * requires `ifTrue` to be strictly prior to the declaring step; `ifFalse`
 * merely has to exist, so a flow can legally point it backward too. A
 * ceiling that only guarded `ifTrue` would leave a backward-pointing
 * `ifFalse` free to loop an agent-spawn node's real subprocess spawn
 * unboundedly, with no `recursionLimit` in this package to catch it. Once
 * that target's `revisionCounts` has *exceeded* `decision.maxRevisions`,
 * routing goes to `'exhausted'` (wired to `END` by the caller) rather than
 * looping again — never a reinterpretation of "predicate was false".
 *
 * **Why `>`, not `>=`.** A target reached via `ifTrue` is validator-required
 * to be strictly prior, meaning it has already executed once *before* the
 * declaring decision ever evaluates for the first time — that pre-existing
 * execution is the original attempt, not a revision. `maxRevisions` counts
 * loop-*backs*, so the ceiling must allow routing while
 * `revisionCounts[target] <= maxRevisions` (equivalently: refuse once it's
 * strictly greater). Using `>=` here undercounts by exactly one revision at
 * every ceiling — `maxRevisions: 1` would permit *zero* loop-backs,
 * indistinguishable from "never revise" — which is what this comparison
 * exists to avoid.
 */
function buildDecisionPathFn(
  nodeId: string,
  decision: PlanStepDecision,
  config: AgentSpawnExecutorConfig
): (state: AgentSpawnGraphStateValue) => DecisionRoute {
  return (state) => {
    const { onEvent } = config
    const { runId } = state

    const examinedResult = state.results[decision.examine]
    if (!examinedResult) {
      const error = `Decision on node '${nodeId}' examines '${decision.examine}', but no result has been recorded for it yet.`
      safeEmit(onEvent, { type: 'node:failed', nodeId, runId, error })
      throw new Error(error)
    }

    // Own-property lookup, for the same reason roleBinaries/mechanicalActions
    // use one: `nodeId` arrives from the Plan, and a bare index resolves an
    // inherited key (`__proto__`, `constructor`) to a value that is truthy
    // but not a function.
    const predicates = config.decisionPredicates
    const predicate = predicates && Object.hasOwn(predicates, nodeId) ? predicates[nodeId] : undefined
    if (!predicate) {
      const error = `No decision predicate configured for node '${nodeId}' (examine '${decision.examine}'). Provide one in AgentSpawnExecutorConfig.decisionPredicates — a decision this executor was not told how to evaluate is never guessed at, and a throwing predicate is refused the same way.`
      safeEmit(onEvent, { type: 'node:failed', nodeId, runId, error })
      throw new Error(error)
    }

    let isTrue: boolean
    try {
      isTrue = predicate(examinedResult as StepNodeResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const error = `Decision predicate for node '${nodeId}' threw and is refused the same way an unconfigured predicate is: ${message}`
      safeEmit(onEvent, { type: 'node:failed', nodeId, runId, error })
      throw new Error(error)
    }

    const target = isTrue ? decision.ifTrue : decision.ifFalse
    const targetRevisions = state.revisionCounts[target] ?? 0
    if (targetRevisions > decision.maxRevisions) return 'exhausted'
    return isTrue ? 'ifTrue' : 'ifFalse'
  }
}

/**
 * Translates a compiled agent-lifecycle Plan into a compiled LangGraph
 * StateGraph. One graph node per Plan node (id preserved verbatim), and
 * `plan.graph.entryNode` wired as the graph's start. Each node's outgoing
 * routing is either:
 *
 * - **Decision-bearing** (`node.decision` set): wired with
 *   `addConditionalEdges` per `buildDecisionPathFn` above — `ifTrue`,
 *   `ifFalse`, or `'exhausted'` → `END`. That node's entry in
 *   `plan.graph.edges` (`compileSteps` emits one regardless of `decision`)
 *   is deliberately not also wired as a plain edge; the decision is this
 *   node's only routing authority.
 * - **Plain** (no `decision`): `plan.graph.edges` reproduced as-is, and any
 *   node with no outgoing edge wired to `END` — unchanged from before this
 *   task.
 */
export function buildAgentSpawnStateGraph(
  plan: Plan,
  executor: AgentLifecycleNodeExecutor,
  config: AgentSpawnExecutorConfig
) {
  const graph = new StateGraph(AgentSpawnGraphState)

  for (const [nodeId, node] of Object.entries(plan.graph.nodes)) {
    graph.addNode(nodeId, async (state: AgentSpawnGraphStateValue) => executor(state, { node, plan }))
  }

  const decisionNodeIds = new Set<string>()
  for (const [nodeId, node] of Object.entries(plan.graph.nodes)) {
    // `decision` exists only on the two agent-lifecycle node variants — a
    // rounds-shaped PlanAgentNode carries no such field at all — so this
    // package's own two node kinds are the only ones ever checked for it.
    if (node.kind !== 'agent-spawn' && node.kind !== 'mechanical') continue
    if (!node.decision) continue
    decisionNodeIds.add(nodeId)
    // `@atta/engine`'s Flow validator already guarantees this for any Plan
    // compiled from a real Flow, but this function accepts a bare `Plan` —
    // a hand-constructed one, or one from a future source that skips that
    // validator, could name a route target that was never declared. Failing
    // here, at build time, with the offending id named, beats surfacing as
    // an opaque LangGraph error the first time that route is ever taken.
    for (const target of [node.decision.ifTrue, node.decision.ifFalse]) {
      if (!Object.hasOwn(plan.graph.nodes, target)) {
        throw new Error(
          `Node '${nodeId}' declares a decision routing to '${target}', which is not a node in this Plan's graph.`
        )
      }
    }
    const pathFn = buildDecisionPathFn(nodeId, node.decision, config)
    // Same compile-time-string-literal typing gap as the addEdge casts
    // below: LangGraph's addConditionalEdges typings expect node names known
    // at compile time, this package wires an arbitrary Plan's runtime ids.
    ;(
      graph as unknown as {
        addConditionalEdges: (
          from: string,
          path: (state: AgentSpawnGraphStateValue) => DecisionRoute,
          pathMap: Record<DecisionRoute, string | typeof END>
        ) => void
      }
    ).addConditionalEdges(nodeId, pathFn, {
      ifTrue: node.decision.ifTrue,
      ifFalse: node.decision.ifFalse,
      exhausted: END
    })
  }

  for (const edge of plan.graph.edges) {
    if (decisionNodeIds.has(edge.from)) continue
    // LangGraph's addNode/addEdge typings require string-literal node names
    // known at compile time; this package wires an arbitrary Plan's runtime
    // node ids, so the cast is required at every edge call site.
    ;(graph as unknown as { addEdge: (from: string, to: string) => void }).addEdge(edge.from, edge.to)
  }

  const nodesWithOutgoingEdge = new Set(plan.graph.edges.map((edge) => edge.from))
  for (const nodeId of Object.keys(plan.graph.nodes)) {
    if (decisionNodeIds.has(nodeId)) continue
    if (!nodesWithOutgoingEdge.has(nodeId)) {
      ;(graph as unknown as { addEdge: (from: string, to: typeof END) => void }).addEdge(nodeId, END)
    }
  }

  ;(graph as unknown as { addEdge: (from: string, to: string) => void }).addEdge('__start__', plan.graph.entryNode)

  return graph.compile()
}
