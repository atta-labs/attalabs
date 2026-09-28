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
 * **The halt lives in the node wrapper, not in the topology.** A run held by a
 * `RunControl` stops at whichever of two points it can reach first. A node that
 * has not started is refused: the wrapper checks the handle before it emits
 * `node:start` or reaches either executor, and throws `RunHaltedError`. A node
 * already running is stopped by its child being terminated — the wrapper
 * forwards `control.signal` into `executeAgentSpawnNode`, and the
 * `ProcessCancelledError` that comes back is re-reported as the halt it is (see
 * `haltOfTerminatedChild`). Nothing about the compiled graph
 * changes — no extra node, no extra edge, no conditional route — because the
 * property a halt needs is already LangGraph's: one checkpoint per superstep, so
 * the last completed node's result is durable and the node that threw is left
 * pending on the thread, which is exactly where a resume continues from. Wiring
 * the halt as topology instead would have to decide, at build time, where a run
 * is allowed to stop; checking it at the wrapper lets the answer be "the next
 * boundary, wherever the run happens to be".
 *
 * **Every observer-facing event is redacted here, and only here.** `safeEmit`
 * is the one function every `AgentLifecycleEvent` passes through — the
 * streaming path's per-record events, the failure and cancellation path's
 * error text, and the lifecycle transitions around both — so it is where the
 * redaction pass is applied. That placement is the whole guarantee: a new
 * emission site added anywhere in this file inherits it without knowing it
 * exists, where a rule each site had to remember would eventually meet a site
 * that did not. The pass itself (`redactSensitiveText` /
 * `redactLifecycleEvent`, in `reason-text.ts`) keeps every structural field —
 * the event's kind, its node id, its run id — and replaces only free text a
 * spawned process authored, so an observer can still tell what it received
 * and which run it belongs to. What it removes is what previously reached an
 * observer verbatim: the machine's absolute paths, the agent session and
 * account identifiers, the account's rate-limit metadata, and a child's
 * unbounded stderr, now a bounded excerpt. One seam is deliberately *not*
 * covered by it and must not be confused with it — `stream-reader.ts`'s
 * `onParsedEvents`, a different hook handing over raw records one level down,
 * which exists precisely so a caller that wants the real stream has one place
 * to get it. What a checkpoint persists is a separate channel with its own
 * mapper (`narrowPersistedResult`, applied at each `results:` write below) over
 * the same `redactSensitiveText`, so the two channels share one definition of
 * sensitive and differ only in their bounds and their fields.
 */

import { END, StateGraph, type BaseCheckpointSaver } from '@langchain/langgraph'
import type { Plan, PlanNode, PlanStepDecision } from '@atta/engine'
import { AgentSpawnGraphState, type AgentSpawnGraphStateValue } from './graph-state'
import { executeMechanicalNode } from './mechanical-executor'
import { executeAgentSpawnNode, type SpawnFn } from './node-executor'
import { ProcessCancelledError } from './process-lifecycle'
import { narrowPersistedResult, redactLifecycleEvent } from './reason-text'
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
 * The halt that a mid-flight child's termination actually was, or `undefined`
 * for any other failure.
 *
 * A node already running when `halt()` fires is stopped by killing its child,
 * which surfaces here as a `ProcessCancelledError` — a value `runHaltOf` does
 * not recognise, so left alone it would report a deliberately halted run as
 * `failed`. That is not a classification detail: `failed` invites a caller to
 * treat the run as broken, and the run is paused. So the cancellation is
 * re-reported as the halt it is, keeping the original as `cause` because it is
 * the only thing that records *how* the child died — on the graceful signal, or
 * on the forced one, which is the difference between a child that got to finish
 * writing and one that did not.
 *
 * Guarded on `control.halted` rather than on the error type alone: a
 * `ProcessCancelledError` from a run nobody halted came from some other signal
 * the caller wired into the node itself, and calling that a halt of *this* run
 * would be a guess.
 */
function haltOfTerminatedChild(
  err: unknown,
  nodeId: string,
  control: RunControl | undefined
): RunHaltedError | undefined {
  if (!control?.halted) return undefined
  if (!(err instanceof ProcessCancelledError)) return undefined
  // `terminatedProcess` tracks whether a child was actually killed, not merely
  // whether the cancellation reached this executor: a signal already aborted on
  // entry spawns nothing, so reporting `true` there would send a caller to
  // inspect a working tree no process of this node's ever touched.
  return new RunHaltedError(nodeId, control.haltReason, { cause: err, terminatedProcess: err.spawned })
}

/**
 * Redacts the event, calls `onEvent` with the result if one is supplied, and
 * swallows anything it throws.
 *
 * **This is the redaction boundary for the whole package.** Every
 * observer-facing event — the streaming path's live records, the
 * failure/cancellation path's error text, the lifecycle transitions around
 * both — reaches an observer through this one function, so redacting here
 * covers every event kind by construction rather than by each emission site
 * remembering to. Redacting at the emission sites instead is what produced
 * the original leak this closes: there was no single enforced point, so a
 * spawned agent's raw output reached `onEvent` with its machine paths,
 * session id and rate-limit metadata intact. A second redaction site added
 * anywhere below would be that same defect, re-introduced.
 *
 * The redaction happens inside the `try` deliberately. It is pure string
 * work and is not expected to throw, but if it ever did, the alternatives are
 * both worse: outside the guard it would break the run an observer is merely
 * watching, and skipping it to emit anyway would hand over exactly the
 * unredacted event this call site exists to prevent.
 *
 * An observer's own bug must never corrupt that run either — an unguarded
 * call site would let a throwing callback masquerade the node's real success
 * as a failure (caught by the wrapper's own `try`/`catch`, discarding the
 * real result) or replace the real error a `catch` block is already
 * reporting.
 */
function safeEmit(onEvent: ((event: AgentLifecycleEvent) => void) | undefined, event: AgentLifecycleEvent): void {
  if (!onEvent) return
  try {
    onEvent(redactLifecycleEvent(event))
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
 * A checkpoint is the whole annotated state, so the `results` channel goes to
 * rest with it. What goes to rest is the *narrowed* form of each result, not the
 * capture: every field a spawned process authored —
 * `AgentSpawnNodeResult.events`, its duplicate of the session id, and
 * `MechanicalNodeResult.stdout`/`stderr`/`command` — is replaced by a bounded,
 * redacted form before the node's result is written back (see
 * `narrowPersistedResult` at each `results:` write below, and
 * `reason-text.ts` for what it removes). Recognised machine paths, session and
 * account identifiers, rate-limit metadata and credential shapes become named
 * placeholders; each field is capped; an agent's stream is capped in record
 * count as well as per record; and every narrowed result carries a `narrowing`
 * naming the fields that happened to, so a consumer can tell a redacted value
 * from a node that simply printed little. The narrowing is applied to what the
 * node *returns* rather than in the state annotation's reducer, because a
 * checkpoint also records that super-step's node writes in its metadata and each
 * finished node's own writes as task entries — all three are the returned value,
 * and a reducer would narrow only one of them.
 *
 * Three things this does not make the saver choice unimportant. The guarantee is
 * a floor: the rules recognise the shapes this package has evidence for, and a
 * spawned process can print a credential in a shape nothing matches — the bound
 * is what keeps an unrecognised one from being stored in full, not a proof there
 * is none. The retained content is still agent-derived: a bounded excerpt of a
 * tool result is smaller than the transcript, not categorically different from
 * it. And `results` is not the only carrier — see `run-identity.ts`'s header for
 * the `outcome` channel and the failed-task error LangGraph persists beside it.
 * So retention, encryption and access are still worth choosing deliberately;
 * what changed is that the choice is no longer the *only* thing standing between
 * a spawned agent's raw output and a durable store. The package's
 * `envAllowlist` keeps secrets from reaching a spawned process; it cannot keep
 * a spawned process from printing one, which is why the stored form is narrowed
 * rather than trusted.
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
 * An optional `control` makes the run haltable, in the two ways this file's
 * header describes. The boundary check is the first thing the returned executor
 * does — ahead of `node:start`, ahead of either executor — so a halted run's
 * next node produces no event, spawns no process, and records no result; that
 * halt bypasses the `catch` block below and so emits no `node:failed`, because
 * it is not a node failure, it is a node that never ran. A node already running
 * when the halt fires is the other case, and it *does* go through that `catch`
 * and does emit `node:failed`: that node genuinely started and genuinely did
 * not complete, so claiming otherwise would hide a real event from an observer.
 * Both are reported as `paused` by `run-control.ts`, on the same basis — the
 * node is pending and the run is resumable. An agent-spawn
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

    // The halt boundary for a node that has not started. Checked here — before
    // `node:start` is emitted and before either executor is reached — because a
    // halted run's next node must not start at all: no event claiming it did, no
    // subprocess spawned, nothing for a resume to have to reconcile. Throwing
    // (rather than returning an empty partial state) is what leaves this node
    // pending on the thread, which is where a resume continues from; returning
    // would let LangGraph route onward as though the node had run. A node
    // already running when the halt fires cannot be caught here — it is stopped
    // by `control.signal` reaching its child, below.
    if (control?.halted) throw new RunHaltedError(node.id, control.haltReason)

    safeEmit(onEvent, { type: 'node:start', nodeId: node.id, runId })

    try {
      if (node.kind === 'mechanical') {
        // The same signal the agent-spawn branch gets, for the same reason: a
        // mechanical node's command holds this run's working directory and
        // execution permissions, so a halt that left it running would keep it
        // acting on the tree — for up to its own `timeoutMs` — after the
        // caller believed the run was cancelled.
        const result = await executeMechanicalNode({ node, config, spawnFn, signal: control?.signal })
        safeEmit(onEvent, { type: 'node:complete', nodeId: node.id, runId })
        // No `sessions` write: a mechanical node has no model turn and so no
        // session for a later step's `resume` to look up.
        return {
          ...resumeRecord(),
          results: { [node.id]: narrowPersistedResult(result) },
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
      const result = await executeAgentSpawnNode({
        node,
        prompt,
        resumeSessionId,
        config,
        spawnFn,
        signal: control?.signal
      })

      for (const reported of result.events) {
        const content = typeof reported === 'string' ? reported : JSON.stringify(reported)
        safeEmit(onEvent, { type: 'node:streaming', nodeId: node.id, runId, content })
      }
      safeEmit(onEvent, { type: 'node:complete', nodeId: node.id, runId })

      // `sessions` takes the real id off the capture, deliberately before the
      // result is narrowed: that channel is what a later step's `resume` reads,
      // and it is the one place the verbatim id has to survive.
      return {
        ...resumeRecord(),
        results: { [node.id]: narrowPersistedResult(result) },
        sessions: result.sessionId ? { [node.id]: result.sessionId } : {},
        revisionCounts: { [node.id]: (state.revisionCounts[node.id] ?? 0) + 1 }
      }
    } catch (err) {
      const reported = haltOfTerminatedChild(err, node.id, control) ?? err
      const error = reported instanceof Error ? reported.message : String(reported)
      safeEmit(onEvent, { type: 'node:failed', nodeId: node.id, runId, error })
      throw reported
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
