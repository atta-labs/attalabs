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
 *
 * **Exhaustion is recorded by a node; completion cannot be.** A decision that
 * refuses to loop again routes to a synthetic per-branch recorder that writes the
 * refused ceiling into the run's `outcome` channel — the path function is the one
 * place that fact is known, and a node is the only thing downstream of a path
 * function that can write state. Nothing here records `completed`, and an earlier
 * revision of this file that tried to was wrong twice over. A shared recorder
 * every terminal step routed through left the graph uncompilable for a legal Plan
 * whose only terminal step declares a decision — both of that decision's targets
 * can point backwards, so nothing edges into the recorder and LangGraph refuses
 * the unreachable node. And in a fan-out where one branch loops through a
 * decision while a sibling terminates, the recorder is re-entered on every pass,
 * so its `completed` write landed beside, and under last-write-wins sometimes
 * after, the exhaustion record — reporting an exhausted run as a successful one,
 * the exact misreading the outcome vocabulary exists to prevent. The lesson is
 * structural, not a bug to patch: "this run is over" is a property of `END` being
 * reached with nothing left pending, which no node can observe about itself and
 * only the caller of `invoke()` sees. So `completed` is written there, once, after
 * the run has no pending task left — see `run-control.ts`.
 *
 * **The halt boundary lives in the node wrapper, not in the topology.** A run
 * held by a `RunControl` stops *between* nodes: the wrapper checks the handle
 * before it emits `node:start` or reaches either executor, and throws
 * `RunHaltedError` if the run was halted. Nothing about the compiled graph
 * changes — no extra node, no extra edge, no conditional route — because the
 * property a halt needs is already LangGraph's: one checkpoint per superstep, so
 * the last completed node's result is durable and the node that threw is left
 * pending on the thread, which is exactly where a resume continues from. Wiring
 * the halt as topology instead would have to decide, at build time, where a run
 * is allowed to stop; checking it at the wrapper lets the answer be "the next
 * boundary, wherever the run happens to be".
 */

import { END, StateGraph, type BaseCheckpointSaver } from '@langchain/langgraph'
import type { Plan, PlanNode, PlanStepDecision } from '@atta/engine'
import { AgentSpawnGraphState, type AgentSpawnGraphStateValue } from './graph-state'
import { executeMechanicalNode } from './mechanical-executor'
import { executeAgentSpawnNode, type SpawnFn } from './node-executor'
import { RunHaltedError } from './run-halt'
import { renderStepPrompt } from './template'
import type {
  AgentLifecycleEvent,
  AgentSpawnExecutorConfig,
  RunControl,
  RunOutcomeRecord,
  StepNodeResult
} from './types'

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
 * Compile-time options for `buildAgentSpawnStateGraph`. Separate from
 * `AgentSpawnExecutorConfig`, which configures what the *nodes* do (which
 * binary a role resolves to, which command an action resolves to, how a
 * decision is evaluated); this configures how the *graph* is compiled.
 *
 * `checkpointer` is the only durable-state seam this package has, and it is
 * always the caller's own: `MemorySaver` for a test, a SQLite/Postgres saver
 * for a run that must survive the process. Passing one is what turns on
 * LangGraph's per-superstep checkpoint write — one write per node boundary,
 * carrying the whole annotated state (`runId`, `results`, `sessions`,
 * `revisionCounts`) — and it is the *only* persistence this package performs.
 * There is deliberately no second store beside it: a suspended run's state is
 * read back through the same checkpointer that wrote it (see
 * `readRunCheckpoint` in `run-identity.ts`), never from a parallel record this
 * package maintains itself, which could disagree with the checkpoint and
 * would then have to be reconciled against it.
 *
 * Omitting it compiles exactly the graph this function compiled before this
 * seam existed — no checkpointer, no writes, `invoke()` needing no
 * `thread_id`. Every pre-existing caller (the three `scripts/` proofs, the
 * `graph-builder.test.ts` suites) therefore keeps working untouched; only a
 * caller that wants durability pays for it.
 *
 * **What supplying one actually persists — read this before choosing a saver.**
 * A checkpoint is the whole annotated state, which means the `results` channel
 * goes to rest verbatim: `AgentSpawnNodeResult.events` is the spawned agent
 * CLI's complete structured stream (its prompts, its tool results, whatever
 * files it read and echoed), and `MechanicalNodeResult.stdout`/`stderr` are the
 * raw output of `git`/`gh`-style commands, kept as text. Content that
 * previously existed only in process memory for the run's duration is, with a
 * checkpointer, durably stored — unredacted, with no size bound, and growing
 * per write, since each superstep re-serializes everything accumulated so far.
 * This package redacts none of it: narrowing what a checkpoint carries is the
 * event-redaction work's own subject, and dropping state here would pre-empt it
 * and could strip something a consumer needs. So the obligation is the
 * caller's, and it is a real one: a store holding these checkpoints holds
 * agent-transcript-grade material (a token printed inside a remote URL, an
 * error body, a credential an agent read aloud), and its retention,
 * encryption and access should be chosen on that basis. The package's
 * `envAllowlist` keeps secrets from reaching a spawned process; it cannot keep
 * a spawned process from printing one.
 */
export interface AgentSpawnGraphCompileOptions {
  checkpointer?: BaseCheckpointSaver
}

/**
 * Per-leg options for the node executor — what is true of *this* invocation of
 * the run rather than of the run's configuration. Kept off
 * `AgentSpawnExecutorConfig` for that reason: a role's binary is the same on
 * every leg, a halt handle and a resumed-from checkpoint id are not.
 */
export interface AgentLifecycleLegOptions {
  /** Halt handle for this leg. Omitted, the leg cannot be halted. */
  control?: RunControl
  /**
   * The checkpoint id this leg is continuing from. Supplied, the first node the
   * leg runs records a `resumed` outcome; omitted, the leg is a first run and
   * records nothing.
   */
  resumedFrom?: string
}

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
 * each deciding independently when to report themselves.
 *
 * An optional `control` makes the run haltable. The check is the first thing
 * the returned executor does — ahead of `node:start`, ahead of either executor
 * — so a halted run's next node produces no event, spawns no process, and
 * records no result. A halt is not routed through the `catch` block below and
 * so never emits `node:failed`: it is not a node failure, it is a node that
 * never ran, and `run-control.ts` reports it as `paused` on that basis. An agent-spawn
 * node's captured event stream is additionally surfaced as `node:streaming`
 * — what the spawned process reported — between `node:start` and
 * `node:complete`; a mechanical node has no such stream, so it only ever
 * produces the two lifecycle events.
 */
export function createAgentLifecycleNodeExecutor(
  config: AgentSpawnExecutorConfig,
  spawnFn?: SpawnFn,
  options?: AgentLifecycleLegOptions
): AgentLifecycleNodeExecutor {
  const control = options?.control
  const resumedFrom = options?.resumedFrom
  let resumeRecorded = false

  /**
   * The `resumed` record, on the first node this leg actually runs and nowhere
   * else. Written from inside a node because that is the only safe way to write
   * a run's state while it still has pending tasks — see this file's header —
   * and on the *first* node because that is the earliest moment a resumed leg is
   * observably under way rather than merely requested.
   */
  const resumeRecord = (): Partial<AgentSpawnGraphStateValue> => {
    if (resumedFrom === undefined || resumeRecorded) return {}
    resumeRecorded = true
    return { outcome: { reason: 'resumed', at: new Date().toISOString(), fromCheckpointId: resumedFrom } }
  }

  return async (state, { node, plan }) => {
    const { onEvent } = config
    const { runId } = state

    // The halt boundary, and the only one there is. Checked here — before
    // `node:start` is emitted and before either executor is reached — because a
    // halted run's next node must not start at all: no event claiming it did, no
    // subprocess spawned, nothing for a resume to have to reconcile. Throwing
    // (rather than returning an empty partial state) is what leaves this node
    // pending on the thread, which is where a resume continues from; returning
    // would let LangGraph route onward as though the node had run.
    if (control?.halted) throw new RunHaltedError(node.id, control.haltReason)

    safeEmit(onEvent, { type: 'node:start', nodeId: node.id, runId })

    try {
      if (node.kind === 'mechanical') {
        const result = await executeMechanicalNode({ node, config, spawnFn })
        safeEmit(onEvent, { type: 'node:complete', nodeId: node.id, runId })
        // No `sessions` write: a mechanical node has no model turn and so no
        // session for a later step's `resume` to look up.
        return {
          ...resumeRecord(),
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
        ...resumeRecord(),
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

/**
 * The four routes a decision's path function can resolve to — see
 * `buildDecisionPathFn`. The two `exhausted*` routes are the same terminal
 * outcome told apart by which branch the predicate resolved to: a path function
 * can only return a route name, so the branch has to be encoded in the route
 * for the recording node to know which target's ceiling was refused. Collapsing
 * them into one route would leave that node guessing between two ceilings, and
 * with both branches able to point backwards the guess is sometimes ambiguous.
 */
type DecisionRoute = 'ifTrue' | 'ifFalse' | 'exhaustedIfTrue' | 'exhaustedIfFalse'

/**
 * Prefix for the synthetic nodes that record an exhausted revision ceiling.
 * Contains no `:` or `|`, both of which LangGraph reserves in node names.
 */
const EXHAUSTION_NODE_PREFIX = 'agent-spawn.revisions-exhausted.'

/** The synthetic recorder for one decision node's one branch. */
function exhaustionNodeId(nodeId: string, branch: 'ifTrue' | 'ifFalse'): string {
  return `${EXHAUSTION_NODE_PREFIX}${nodeId}.${branch}`
}

/**
 * Builds the synthetic node a refused route lands on: it records why the run
 * stopped, into the run's own state, and then terminates.
 *
 * **Why a node and not a derivation after the fact.** Routing to `END` directly
 * — which is what this graph did before — made an exhausted run byte-identical
 * to one that ran to its last step, so the only way to tell them apart was to
 * re-read the ceilings off the final state afterwards. That derivation is
 * unsound: a target's revision count can exceed some *other* decision's ceiling
 * long after that decision last evaluated, so it reports exhaustion for runs
 * that ended for unrelated reasons. The path function is the one place the fact
 * is known for certain, and a node is the only thing downstream of a path
 * function that can write state — so the record is written here, one superstep
 * later, and is durable with the rest of the state the checkpointer holds.
 *
 * It writes only `outcome`. It is not a Plan node, so it records no result and
 * increments no revision count — a run's recorded `results` stays exactly the
 * set of Plan steps that really executed.
 */
function buildExhaustionRecorder(
  nodeId: string,
  target: string,
  maxRevisions: number
): (state: AgentSpawnGraphStateValue) => Partial<AgentSpawnGraphStateValue> {
  return (state) => {
    const record: RunOutcomeRecord = {
      reason: 'exhausted',
      at: new Date().toISOString(),
      exhaustion: { nodeId, target, maxRevisions, revisions: state.revisionCounts[target] ?? 0 }
    }
    return { outcome: record }
  }
}

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
 * routing goes to the `exhausted*` route for the branch it resolved to — wired
 * by the caller to a synthetic node that records the refused ceiling and then
 * terminates — rather than looping again. Never a reinterpretation of
 * "predicate was false", and never a silent terminal either: the reason the run
 * stopped is written into the run's own state, so a completed run and an
 * exhausted one are distinguishable afterwards from the store alone.
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
    if (targetRevisions > decision.maxRevisions) return isTrue ? 'exhaustedIfTrue' : 'exhaustedIfFalse'
    return isTrue ? 'ifTrue' : 'ifFalse'
  }
}

/**
 * The Plan steps this builder wires straight to `END` — a step with no outgoing
 * edge that does not declare a `decision` (a decision node's routing is its own
 * authority, so it never gets a terminal edge).
 *
 * Exported because two callers need the same answer and must not each derive it.
 * The wiring loop below uses it to add those edges; `run-control.ts` uses it to
 * name the `asNode` its `completed` write is applied as. That write needs a node
 * whose only outgoing edge is `END`, so applying an update as it recomputes an
 * empty pending set — LangGraph cannot infer a writer node on a thread whose
 * lineage includes a resumed leg (`Ambiguous update, specify "asNode"`, measured
 * on the pinned version), and every other candidate risks re-arming a successor.
 *
 * An empty result means the graph has no ordinary termination at all: every path
 * ends in a decision, so the only way out is an exhausted ceiling. A Plan whose
 * one terminal step declares a decision is exactly that shape, and it is legal —
 * both of a decision's targets may point backwards.
 */
export function terminalPlanNodeIds(plan: Plan): string[] {
  const withOutgoingEdge = new Set(plan.graph.edges.map((edge) => edge.from))
  return Object.keys(plan.graph.nodes).filter((nodeId) => {
    if (withOutgoingEdge.has(nodeId)) return false
    const node = plan.graph.nodes[nodeId]
    if (node === undefined) return false
    if (node.kind !== 'agent-spawn' && node.kind !== 'mechanical') return true
    return !node.decision
  })
}

/**
 * Translates a compiled agent-lifecycle Plan into a compiled LangGraph
 * StateGraph. One graph node per Plan node (id preserved verbatim), and
 * `plan.graph.entryNode` wired as the graph's start. Each node's outgoing
 * routing is either:
 *
 * - **Decision-bearing** (`node.decision` set): wired with
 *   `addConditionalEdges` per `buildDecisionPathFn` above — `ifTrue`,
 *   `ifFalse`, or, when the resolved branch's revision ceiling is exceeded, a
 *   synthetic per-branch recorder node that writes the refused ceiling into the
 *   run's `outcome` channel and then goes to `END`. That node's entry in
 *   `plan.graph.edges` (`compileSteps` emits one regardless of `decision`)
 *   is deliberately not also wired as a plain edge; the decision is this
 *   node's only routing authority. A Plan with no decisions gets no recorder
 *   nodes at all, so its compiled topology is unchanged — and a Plan whose only
 *   terminal step *is* a decision compiles too, because nothing but that
 *   decision's own recorders is added on its behalf.
 * - **Plain** (no `decision`): `plan.graph.edges` reproduced as-is, and any
 *   node with no outgoing edge wired to `END` — unchanged from before the
 *   control surface existed.
 *
 * `options.checkpointer`, when supplied, is handed straight to
 * `graph.compile()` and is this package's entire durability story — see
 * `AgentSpawnGraphCompileOptions`. It changes no topology: the same nodes and
 * the same edges are wired either way, and the only difference is that
 * LangGraph writes a checkpoint at each node boundary under the `thread_id`
 * the caller passes at `invoke()` time (`startRun` in `run-identity.ts` is
 * the entry point that guarantees that id is the run's own, every time).
 */
export function buildAgentSpawnStateGraph(
  plan: Plan,
  executor: AgentLifecycleNodeExecutor,
  config: AgentSpawnExecutorConfig,
  options?: AgentSpawnGraphCompileOptions
) {
  const graph = new StateGraph(AgentSpawnGraphState)

  for (const nodeId of Object.keys(plan.graph.nodes)) {
    // The synthetic exhaustion recorders below are named by prefixing a Plan
    // node's own id, so a Plan node already carrying that prefix could collide
    // with one of them — and a collision here would silently replace a real
    // step with a terminal recorder. Refusing names the offending id instead.
    if (nodeId.startsWith(EXHAUSTION_NODE_PREFIX)) {
      throw new Error(
        `Plan node '${nodeId}' starts with '${EXHAUSTION_NODE_PREFIX}', which this executor reserves for the synthetic nodes that record an exhausted revision ceiling — rename the step.`
      )
    }
  }

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
    // One recorder per branch, each wired straight to END. Added here rather
    // than up front because a Plan with no decisions gets none of them: the
    // graph a decision-free Plan compiles to is exactly the graph it compiled
    // to before exhaustion was recordable at all.
    for (const [branch, target] of [
      ['ifTrue', node.decision.ifTrue],
      ['ifFalse', node.decision.ifFalse]
    ] as const) {
      const recorderId = exhaustionNodeId(nodeId, branch)
      graph.addNode(recorderId, buildExhaustionRecorder(nodeId, target, node.decision.maxRevisions))
      ;(graph as unknown as { addEdge: (from: string, to: typeof END) => void }).addEdge(recorderId, END)
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
      exhaustedIfTrue: exhaustionNodeId(nodeId, 'ifTrue'),
      exhaustedIfFalse: exhaustionNodeId(nodeId, 'ifFalse')
    })
  }

  for (const edge of plan.graph.edges) {
    if (decisionNodeIds.has(edge.from)) continue
    // LangGraph's addNode/addEdge typings require string-literal node names
    // known at compile time; this package wires an arbitrary Plan's runtime
    // node ids, so the cast is required at every edge call site.
    ;(graph as unknown as { addEdge: (from: string, to: string) => void }).addEdge(edge.from, edge.to)
  }

  // A terminal Plan step goes straight to `END`, as it always has. There is
  // deliberately no synthetic node recording `completed` here — see this file's
  // header for why no node can know a run completed.
  for (const nodeId of terminalPlanNodeIds(plan)) {
    ;(graph as unknown as { addEdge: (from: string, to: typeof END) => void }).addEdge(nodeId, END)
  }

  ;(graph as unknown as { addEdge: (from: string, to: string) => void }).addEdge('__start__', plan.graph.entryNode)

  // The no-checkpointer path calls `compile()` with no argument at all rather
  // than `compile({ checkpointer: undefined })` — the two are equivalent under
  // LangGraph's current destructuring signature, but the bare call is the
  // literal pre-seam behavior, so a caller that passes no options cannot have
  // been affected by this change even if that signature later stops treating
  // an absent key and an undefined value alike.
  return options?.checkpointer ? graph.compile({ checkpointer: options.checkpointer }) : graph.compile()
}
