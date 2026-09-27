/**
 * @file run-control.ts
 * @description The typed public control surface for a run: start it, halt it,
 * resume it, and get back a typed reason for why the leg you ran stopped.
 *
 * **What this adds over `startRun`.** `run-identity.ts` already starts a run
 * under a stable identity against a caller-supplied checkpointer, and reads a
 * suspended run's state back. What it cannot tell a caller is *why* a run is no
 * longer executing: it resolves on success and rejects on anything else, so a
 * halt, a broken node and a run that exhausted its revision ceiling are three
 * different facts arriving through two undifferentiated channels. The
 * operations here return a `RunOutcome` discriminated on `reason` instead, so
 * there is no field a caller can read as "it worked" without first saying which
 * of those it is treating as success.
 *
 * **Why the outcome is a value and not only an exception.** A bounded agent
 * runner's own contract does both, deliberately: the OpenAI Agents SDK throws
 * `MaxTurnsExceededError` when `maxTurns` is reached — an explicit typed
 * non-success on a limit, never a final output — while its `errorHandlers`
 * option converts exactly those bounded failures into a returned result for a
 * caller that would rather branch than catch. This surface takes the second
 * shape for the same reason that option exists: a caller deciding what to do
 * with a paused, failed or exhausted run is writing a branch, and a `catch` that
 * has to re-classify an `unknown` is where the "exhausted, so it must have
 * succeeded" misreading gets in.
 *
 * **The three operations, and what each is built on.**
 *
 * - `createRunControl()` (in `run-halt.ts`) is the halt operation. Its
 *   `AbortSignal` shape is the cancellation input a bounded runner already
 *   takes, and its effect is a stop at the next node boundary.
 * - `startControlledRun` begins a run at the Plan's entry node, under a new or
 *   caller-supplied identity, refusing a thread that already holds a
 *   checkpoint — the same refusal `startRun` makes, from the same assertion.
 * - `resumeControlledRun` continues a run from its own last checkpoint, under
 *   the same identity, by invoking the graph with a `null` input. No completed
 *   node is re-executed, because LangGraph resumes the thread's *pending* tasks
 *   rather than replaying its history: the sessions contract these operations
 *   model says exactly this of a run continued from saved state — "the resumed
 *   turn is added to memory without re-preparing the input". `run-control.test.ts`
 *   proves it here by counting spawns per node across the halt/resume seam
 *   rather than trusting the claim.
 *
 * **Reconstructing a resumed run from its transcript is not an option here, by
 *   construction.** The resume path never reads `results` to rebuild a prompt
 *   history and re-drive the graph from the entry node; it hands LangGraph the
 *   same thread and lets it continue. That matters beyond efficiency: these
 *   nodes spawn real processes and run real `git`-shaped commands, so a
 *   transcript-replay resume would re-perform completed side effects that no
 *   amount of prompt reconstruction can undo.
 *
 * **One leg at a time is the caller's obligation, and nothing here can enforce
 * it.** Both operations are read-then-act: `startControlledRun` checks that the
 * thread holds no checkpoint, `resumeControlledRun` reads the checkpoint and the
 * pending set, and each then invokes. Two concurrent resumes of one `runId`
 * therefore both pass their preconditions and both execute the same pending node —
 * running an agent CLI or a `git`-shaped command twice against one working
 * directory. That is the same class of damage the no-replay property exists to
 * prevent, arriving by a different route, and it is not fixable here: an atomic
 * claim needs a lease primitive `BaseCheckpointSaver` does not have, and inventing
 * one would be the second store beside the checkpointer this package refuses to
 * keep. So it is a stated obligation, like the saver choice and the redaction
 * exposure: **a caller must serialise legs of one run itself** — one process, one
 * queue, or its own lock keyed by `runId`. A caller that cannot is choosing the
 * duplicate execution, not being surprised by it.
 *
 * **What a caller still owns.** Resuming requires the *same* Plan the run
 * started with — the checkpoint stores state, never the Plan — so
 * `resumeControlledRun` cannot verify the Plan is the original one. It does
 * refuse a Plan that could not have produced this run's recorded results (see
 * `assertPlanCoversRecordedResults`), which catches a grossly wrong Plan rather
 * than every subtly wrong one. Handing it a Plan whose topology differs from the
 * original's is a caller error that can re-execute completed work, and the
 * guard is a backstop, not a licence to skip it.
 */

import type { BaseCheckpointSaver } from '@langchain/langgraph'
import type { Plan } from '@atta/engine'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
import type { AgentSpawnGraphStateValue } from './graph-state'
import type { SpawnFn } from './node-executor'
import { describesRunHalt, failureMessageOf, runHaltOf } from './run-halt'
import {
  assertDerivedIdentity,
  assertNoExistingCheckpoint,
  createRunIdentity,
  initialRunState,
  persistCompletedRecord,
  readRunCheckpoint,
  runInvokeConfig
} from './run-identity'
import type {
  AgentSpawnExecutorConfig,
  RunCheckpointState,
  RunControl,
  RunExhaustion,
  RunIdentity,
  RunOutcome,
  RunOutcomeRecord
} from './types'

/** Compiled shape this module drives — named once so the helpers below read plainly. */
type CompiledRunGraph = ReturnType<typeof buildAgentSpawnStateGraph>

/** What both control operations need in order to compile and drive the run's graph. */
interface ControlledRunBase {
  plan: Plan
  config: AgentSpawnExecutorConfig
  /**
   * Required, as it is on `startRun`: an operation that reports a typed outcome
   * has to be able to read the run's own recorded state back, and without a
   * checkpointer there is nothing to read.
   */
  checkpointer: BaseCheckpointSaver
  /** The halt handle for this leg. Omitted, the leg cannot be halted. */
  control?: RunControl
  /** Test/injection seam, forwarded to the node executor unchanged. */
  spawnFn?: SpawnFn
  /** Forwarded to `invoke()` when supplied — a legally looping Plan can exceed LangGraph's default ceiling. */
  recursionLimit?: number
}

export interface StartControlledRunParams extends ControlledRunBase {
  /**
   * Start under an identity the caller already holds. Omitted, a fresh one is
   * minted — and reported to `onIdentity` before anything runs, which is the
   * only reliable way to learn a minted id for a leg that then pauses or fails.
   */
  identity?: RunIdentity
  /**
   * Called with the run's identity before the graph is invoked. Anything it
   * throws propagates, before the run starts: a caller whose "record this run
   * id" step fails should not get an unrecorded run.
   */
  onIdentity?: (identity: RunIdentity) => void
}

export interface ResumeControlledRunParams extends ControlledRunBase {
  /**
   * The run to continue. Required and never minted — a resume with a fresh
   * identity would silently start a *new* run, which is the one mistake this
   * parameter's requiredness rules out.
   */
  identity: RunIdentity
}

/**
 * Nodes LangGraph still owes this thread — where a resume continues from, and
 * the observable difference between a run that stopped mid-flight and one that
 * reached a terminal node.
 *
 * Read through the compiled graph rather than derived from a raw checkpoint
 * tuple: which tasks remain pending is LangGraph's own bookkeeping, and
 * re-deriving it here would be this package's second, disagreeing account of a
 * fact the checkpointer already holds.
 */
async function pendingNodesOf(
  graph: CompiledRunGraph,
  identity: RunIdentity,
  recursionLimit?: number
): Promise<string[]> {
  const snapshot = await graph.getState(runInvokeConfig(identity, recursionLimit))
  return [...snapshot.next]
}

/**
 * Reads the run's persisted state for an outcome that is already reporting a
 * halt or a failure, and gives up rather than throwing if the read itself
 * fails.
 *
 * `readRunCheckpoint` throws on a corrupt or colliding checkpoint, by design.
 * On the success path that is the right behaviour — a completed run whose own
 * recorded state is unreadable is a real error, and it surfaces. But on the
 * paused and failed paths the caller is already being told something went
 * wrong, and letting a second, unrelated error replace the first would lose the
 * message the caller actually needs. So the outcome simply carries no
 * checkpoint, which its own type documents as possible.
 */
async function checkpointForNonSuccess(
  checkpointer: BaseCheckpointSaver,
  identity: RunIdentity
): Promise<RunCheckpointState | undefined> {
  try {
    return await readRunCheckpoint(checkpointer, identity)
  } catch {
    return undefined
  }
}

/**
 * The pending-node list for an outcome that is already reporting a halt or a
 * failure, giving up rather than throwing if the snapshot read itself fails.
 *
 * Same rule as `checkpointForNonSuccess` above, and for the same reason: this
 * runs while the caller is already being told something went wrong, so a second
 * unrelated error must not replace the first.
 *
 * It returns `undefined`, never `[]`, when the read fails. An empty array is an
 * affirmative statement that nothing is pending — the opposite of what a paused
 * run means — so collapsing "could not be read" into it would have the outcome
 * assert something false about the run. The field it fills is optional for exactly
 * this distinction.
 */
async function pendingNodesForNonSuccess(
  graph: CompiledRunGraph,
  identity: RunIdentity,
  recursionLimit?: number
): Promise<string[] | undefined> {
  try {
    return await pendingNodesOf(graph, identity, recursionLimit)
  } catch {
    return undefined
  }
}

/**
 * LangGraph's own channel for a failed task's serialized error, kept on the
 * thread's pending writes. Hardcoded because the constant (`ERROR`) is not
 * re-exported from `@langchain/langgraph`'s package root; the same fact is
 * reachable through the public `StateSnapshot.tasks[].error`, which needs a
 * compiled graph — and therefore the Plan — where `readRunOutcome` deliberately
 * needs nothing but the store and the run id.
 */
const LANGGRAPH_ERROR_CHANNEL = '__error__'

/**
 * Where each outcome record is written, and why the two places differ.
 *
 * **Inside a node, for anything a node can know.** `resumed` is written by the
 * node executor on a resumed leg's first node; `exhausted` by the per-branch
 * recorder a refused ceiling routes to. Both are facts a node genuinely holds at
 * the moment it runs, and writing them there makes them ordinary superstep
 * commits — durable with the rest of the state, with no second store to reconcile.
 *
 * **Outside the graph, for `completed`, because no node can know it.** "This run
 * is over" is a property of `END` being reached with nothing left pending, which
 * no node can observe about itself. An earlier revision of this surface tried
 * anyway, with one shared recorder every terminal step routed through, and it was
 * wrong twice: a legal Plan whose only terminal step declares a decision left
 * that recorder with no incoming edge at all (both of a decision's targets may
 * point backwards) so the graph would not compile; and in a fan-out where one
 * branch loops through a decision while a sibling terminates, the recorder was
 * re-entered every pass and its `completed` write landed beside the exhaustion
 * record — under last-write-wins, sometimes after it, reporting an exhausted run
 * as a successful one. So `completed` is written here, by
 * `persistCompletedRecord`, after `invoke()` has resolved and only when no
 * exhaustion was recorded.
 *
 * **That write is safe precisely because it happens on a finished thread.** The
 * mechanism — `graph.updateState(config, { outcome })` — is unusable on a thread
 * that still has a pending continuation, which is what a paused or failed run
 * leaves behind. Measured on this repo's pinned LangGraph: with the writer node
 * inferred, a second such update in a thread's lifetime fails outright
 * (`Ambiguous update, specify "asNode"`), and naming `asNode` explicitly is worse
 * than failing, because the update is applied *as* that node and the pending set
 * is recomputed from its outgoing edges — a run halted before node C, updated as
 * node B, resumes with C already routed past and never executed. On a thread with
 * nothing pending none of that applies: the update is unambiguous and the pending
 * set stays empty, verified across a halt-and-resume lineage.
 *
 * **And `paused`/`failed` are never written at all.** A halted or broken run
 * already has its error persisted by LangGraph as the failed task's own write, so
 * duplicating it would be the second disagreeing record the identity contract
 * exists to rule out. `readRunOutcome` reads them from there.
 */

/**
 * A complete `RunExhaustion`, or `undefined` for a value that is not one.
 *
 * Every field is checked, and the container is checked for being a plain object
 * rather than merely `typeof 'object'` — `null` and an array both satisfy that
 * test, so an `exhaustion: null` or `exhaustion: []` from a store this package
 * does not own would otherwise be narrowed to a type with four required fields
 * and handed to a consumer that reads `.nodeId` off it.
 */
function validExhaustion(value: unknown): RunExhaustion | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const { nodeId, target, maxRevisions, revisions } = value as Record<string, unknown>
  if (typeof nodeId !== 'string' || nodeId === '') return undefined
  if (typeof target !== 'string' || target === '') return undefined
  if (!Number.isInteger(maxRevisions) || (maxRevisions as number) < 0) return undefined
  if (!Number.isInteger(revisions) || (revisions as number) < 0) return undefined
  return { nodeId, target, maxRevisions: maxRevisions as number, revisions: revisions as number }
}

/**
 * The exhaustion an in-graph recorder wrote into this state, or `undefined` if
 * the run's graph terminated for any other reason.
 *
 * **A malformed exhausted record throws rather than reading as "not exhausted".**
 * Returning `undefined` for one would send `outcomeFromResolution` down its
 * `completed` branch, so a corrupt or tampered record would be reported as a
 * successful run — the silent success this vocabulary exists to prevent, arriving
 * through the validation meant to protect it. The record says the run stopped on
 * a ceiling; if its payload cannot be read, the honest answer is an error, never
 * a success.
 */
function exhaustionOf(state: AgentSpawnGraphStateValue): RunExhaustion | undefined {
  const record = state.outcome
  if (record?.reason !== 'exhausted') return undefined
  const exhaustion = validExhaustion(record.exhaustion)
  if (!exhaustion) {
    throw new Error(
      `This run's state records reason 'exhausted' with an unreadable exhaustion payload — refusing to report it, and refusing to fall through to 'completed', because a run stopped by a ceiling is not a successful one.`
    )
  }
  return exhaustion
}

/**
 * The serialized error LangGraph kept for the tasks that failed on this thread,
 * and whether every one of them was a halt.
 *
 * LangGraph writes one `__error__` entry per failed task, so a superstep can hold
 * several. Reading only the first one would report a superstep that mixed a halt
 * with a genuine break as `paused` whenever the halt's write came first — the same
 * misclassification `runHaltOf` refuses for the in-memory aggregate, and harmful
 * for the same reason: a pause invites a resume straight back into the broken
 * node. So all of them are read, and the run counts as halted only if every one
 * is a halt. When one is not, its message is the one reported: the failure is the
 * fact the caller has to act on.
 */
function failedTaskErrors(
  pendingWrites: ReadonlyArray<readonly [string, string, unknown]> | undefined
): { halted: boolean; message: string } | undefined {
  const errors: Array<{ name?: string; message?: string }> = []
  for (const write of pendingWrites ?? []) {
    if (write[1] !== LANGGRAPH_ERROR_CHANNEL) continue
    const value = write[2]
    if (typeof value === 'object' && value !== null) errors.push(value as { name?: string; message?: string })
  }
  if (errors.length === 0) return undefined

  const messageOf = (error: { message?: string }) =>
    typeof error.message === 'string' ? error.message : 'the error carried no message'
  const notHalt = errors.find((error) => !describesRunHalt(error))
  if (notHalt) return { halted: false, message: messageOf(notHalt) }
  const [first] = errors
  return { halted: true, message: first === undefined ? 'the error carried no message' : messageOf(first) }
}

/** Whether a checkpointed value is one of this package's own in-graph outcome records. */
function isRunOutcomeRecord(value: unknown): value is RunOutcomeRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as { reason?: unknown; at?: unknown }
  if (typeof candidate.at !== 'string') return false
  switch (candidate.reason) {
    case 'completed':
      return true
    case 'resumed':
      return typeof (value as { fromCheckpointId?: unknown }).fromCheckpointId === 'string'
    case 'exhausted':
      return validExhaustion((value as { exhaustion?: unknown }).exhaustion) !== undefined
    // `paused` and `failed` are derived from LangGraph's own failed-task write,
    // never written into this channel — one appearing here did not come from
    // this package.
    default:
      return false
  }
}

/**
 * The run's recorded outcome, read from the checkpointer and the identity alone —
 * no Plan, no compiled graph, no replay, and nothing but the `runId` needed to
 * get here after a process restart.
 *
 * This is the observable half of the vocabulary. A run's reason for not
 * executing is a fact about the run, so it has to be answerable by whoever holds
 * the store rather than only by whoever happened to call the operation that
 * ended the leg — a dashboard, a later process, an operator deciding whether to
 * resume.
 *
 * **Two sources, composed in one order that is not arbitrary.** A failed task
 * LangGraph persisted for this thread is the most recent thing that happened to
 * the run, so it wins: it means the run stopped mid-flight, `paused` if the
 * error was this package's own halt and `failed` otherwise. Only when no task
 * failed does the in-graph record speak, and then it is the whole answer —
 * `completed`, `exhausted`, or `resumed` for a continuation still under way.
 * Reading the record first would report a run as `resumed` or `completed` when a
 * later leg had in fact broken on its very next node.
 *
 * `undefined` means the run has no outcome yet: an identity the store has never
 * seen, or a first leg still running. An unrecognised `outcome` value is refused
 * by name rather than returned, the same way a checkpointed channel entry this
 * package could not have written is — reporting a recorded run as unrecorded is
 * the same misreading inverted.
 *
 * **A checkpoint recording a different `runId` is refused, exactly as
 * `readRunCheckpoint` refuses it.** The two functions read the same tuple, and a
 * thread holding another run's state can only come from a colliding key — so
 * reporting its outcome as this run's would hand an operator deciding whether to
 * resume a terminal state belonging to someone else's run. The cross-check has to
 * be here too and not only in the sibling read: this is the function a dashboard
 * calls, and it is the cheaper of the two to call.
 */
export async function readRunOutcome(
  checkpointer: BaseCheckpointSaver,
  identity: RunIdentity
): Promise<RunOutcomeRecord | undefined> {
  assertDerivedIdentity(identity)

  const tuple = await checkpointer.getTuple(runInvokeConfig(identity))
  if (!tuple) return undefined

  const values = tuple.checkpoint.channel_values as Record<string, unknown>
  const checkpointedRunId = values.runId
  if (typeof checkpointedRunId !== 'string' || checkpointedRunId !== identity.runId) {
    throw new Error(
      `Checkpoint on thread '${identity.threadId}' records runId '${String(checkpointedRunId)}', not '${identity.runId}' — refusing to read another run's outcome as this one's.`
    )
  }

  const at = tuple.checkpoint.ts
  const failure = failedTaskErrors(tuple.pendingWrites as ReadonlyArray<readonly [string, string, unknown]>)
  if (failure) {
    return failure.halted
      ? { reason: 'paused', at, detail: failure.message }
      : { reason: 'failed', at, error: failure.message }
  }

  const recorded = values.outcome
  if (recorded === undefined || recorded === null) return undefined
  if (!isRunOutcomeRecord(recorded)) {
    throw new Error(
      `Checkpoint on thread '${identity.threadId}' records an 'outcome' value this executor could not have written — refusing to read it as run '${identity.runId}' outcome.`
    )
  }
  return recorded
}

/**
 * Turns a rejection from `invoke()` into the outcome it actually is: a halt is
 * `paused` with a pending continuation, anything else is `failed`.
 *
 * This distinction is the reason the control surface exists. Both arrive as a
 * rejected promise from the same call, and a caller that treated them alike
 * would either retry a deliberately-halted run or quietly abandon a broken one.
 */
async function outcomeFromRejection(
  error: unknown,
  graph: CompiledRunGraph,
  identity: RunIdentity,
  checkpointer: BaseCheckpointSaver,
  resumedFrom: string | undefined,
  recursionLimit?: number
): Promise<RunOutcome> {
  const pendingNodes = await pendingNodesForNonSuccess(graph, identity, recursionLimit)
  const checkpoint = await checkpointForNonSuccess(checkpointer, identity)
  const halt = runHaltOf(error)

  if (halt) {
    return {
      reason: 'paused',
      identity,
      ...(pendingNodes === undefined ? {} : { pendingNodes }),
      ...(halt.haltReason === undefined ? {} : { haltReason: halt.haltReason }),
      ...(checkpoint === undefined ? {} : { checkpoint }),
      ...(resumedFrom === undefined ? {} : { resumedFrom })
    }
  }

  return {
    reason: 'failed',
    identity,
    // `failureMessageOf`, not `error.message`: a superstep with several failed
    // tasks rejects with an `AggregateError` naming no node, while the store's own
    // error write holds the real message — the two must not disagree.
    error: failureMessageOf(error),
    ...(pendingNodes === undefined ? {} : { pendingNodes }),
    ...(checkpoint === undefined ? {} : { checkpoint }),
    ...(resumedFrom === undefined ? {} : { resumedFrom })
  }
}

/**
 * Turns a resolved `invoke()` into the terminal outcome it actually is:
 * `exhausted` when the run's graph terminated on a refused revision ceiling,
 * `completed` otherwise.
 *
 * **A resolved invoke is not a successful run.** Both terminate the graph
 * normally, so the resolution itself carries no information about which
 * happened. The difference is the record an in-graph recorder wrote at the
 * moment routing refused to loop — read here, never re-derived from the
 * ceilings afterwards, because that derivation can report exhaustion for a run
 * that ended for an unrelated reason. Only when no such record is present is
 * `completed` written, which is what stops an exhausted run's reason being
 * overwritten by a success it did not have.
 *
 * The checkpoint read is deliberately *not* softened the way the non-success
 * path's is: a terminated run whose recorded state cannot be read is an error
 * worth surfacing, not something to report as a run with no state.
 */
async function outcomeFromResolution(
  state: AgentSpawnGraphStateValue,
  graph: CompiledRunGraph,
  plan: Plan,
  identity: RunIdentity,
  checkpointer: BaseCheckpointSaver,
  resumedFrom: string | undefined,
  recursionLimit?: number
): Promise<RunOutcome> {
  const exhaustion = exhaustionOf(state)
  if (exhaustion) {
    // Already persisted by the recorder node, in the same superstep that knew
    // it — nothing to write here, and nothing that could overwrite it: the
    // `completed` write below is the only other writer, and it is skipped.
    const exhausted = await readRunCheckpointOrThrow(checkpointer, identity)
    return {
      reason: 'exhausted',
      identity,
      checkpoint: exhausted,
      exhaustion,
      ...(resumedFrom === undefined ? {} : { resumedFrom })
    }
  }

  await persistCompletedRecord(graph, plan, identity, recursionLimit)
  const checkpoint = await readRunCheckpointOrThrow(checkpointer, identity)
  return {
    reason: 'completed',
    identity,
    checkpoint,
    ...(resumedFrom === undefined ? {} : { resumedFrom })
  }
}

/** The run's persisted state, or a named error — a terminated run always wrote one. */
async function readRunCheckpointOrThrow(
  checkpointer: BaseCheckpointSaver,
  identity: RunIdentity
): Promise<RunCheckpointState> {
  const checkpoint = await readRunCheckpoint(checkpointer, identity)
  if (!checkpoint) {
    throw new Error(
      `Run '${identity.runId}' resolved but its checkpointer holds no checkpoint on thread '${identity.threadId}' — a terminated run always wrote one, so the saver supplied did not persist what it was handed.`
    )
  }
  return checkpoint
}

/**
 * Begins a run and reports a typed reason for how the leg ended.
 *
 * Halting is the caller's to trigger: pass a `control` from `createRunControl`,
 * keep it, and call `halt()` on it. The leg then resolves to a `paused` outcome
 * naming the nodes a resume will continue from — it does not reject, because a
 * halt is something the caller asked for.
 */
export async function startControlledRun(params: StartControlledRunParams): Promise<RunOutcome> {
  const { plan, config, checkpointer, control, spawnFn, recursionLimit, onIdentity } = params
  const identity = params.identity ?? createRunIdentity()
  assertDerivedIdentity(identity)

  onIdentity?.(identity)
  await assertNoExistingCheckpoint(checkpointer, identity)

  const executor = createAgentLifecycleNodeExecutor(config, spawnFn, { control })
  const graph = buildAgentSpawnStateGraph(plan, executor, config, { checkpointer })

  let state: AgentSpawnGraphStateValue
  try {
    state = (await graph.invoke(
      initialRunState(identity),
      runInvokeConfig(identity, recursionLimit)
    )) as AgentSpawnGraphStateValue
  } catch (error) {
    return await outcomeFromRejection(error, graph, identity, checkpointer, undefined, recursionLimit)
  }

  return await outcomeFromResolution(state, graph, plan, identity, checkpointer, undefined, recursionLimit)
}

/**
 * Refuses a Plan that cannot be the one this run recorded its results under.
 *
 * Not a proof the Plan is the original — the checkpoint stores state, never the
 * Plan, so nothing here can be. What it does catch is the substituted-Plan
 * mistake that would do real damage: a Plan missing a node this run already
 * completed has different topology, so continuing under it would route the run
 * somewhere the original never would and re-execute completed work. Refusing
 * costs one comparison and turns a silent wrong-Plan resume into a named error.
 */
function assertPlanCoversRecordedResults(plan: Plan, checkpoint: RunCheckpointState): void {
  for (const nodeId of Object.keys(checkpoint.results)) {
    if (!Object.hasOwn(plan.graph.nodes, nodeId)) {
      throw new Error(
        `Run '${checkpoint.identity.runId}' recorded a result for node '${nodeId}', which the Plan passed to resumeControlledRun does not contain — this is not the Plan the run started under, and resuming on it would route the run differently and re-execute completed steps.`
      )
    }
  }
}

/**
 * Continues a run from its own last checkpoint, under the same identity.
 *
 * Invokes the graph with a `null` input, which is how LangGraph continues a
 * thread's pending tasks rather than replaying it: every node that already
 * completed keeps its recorded result and is not called again, and execution
 * picks up at exactly the nodes the halted leg left pending.
 *
 * **This is not a claim on the run.** The checkpoint read, the pending-set check
 * and the invoke are three steps with no lock between them, so a second concurrent
 * resume of the same `runId` passes the same preconditions and runs the same
 * pending node. Serialising legs is the caller's, per this file's header.
 *
 * Two shapes are refused rather than guessed at. A thread with no checkpoint
 * cannot be continued — there is no position to continue from — and a thread
 * with nothing pending has already reached a terminal node, so a resume would
 * either do nothing or re-enter a finished run; both say so by name. Together
 * they make the operation's precondition the exact mirror of a start's: a start
 * refuses a thread that has state, a resume refuses one that has none.
 */
export async function resumeControlledRun(params: ResumeControlledRunParams): Promise<RunOutcome> {
  const { plan, config, checkpointer, identity, control, spawnFn, recursionLimit } = params
  assertDerivedIdentity(identity)

  const checkpoint = await readRunCheckpoint(checkpointer, identity)
  if (!checkpoint) {
    throw new Error(
      `Run '${identity.runId}' has no checkpoint on thread '${identity.threadId}' — there is no position to continue from. Start it with startControlledRun; a resume never begins a run.`
    )
  }
  assertPlanCoversRecordedResults(plan, checkpoint)

  const resumedFrom = checkpoint.checkpointId
  const executor = createAgentLifecycleNodeExecutor(config, spawnFn, { control, resumedFrom })
  const graph = buildAgentSpawnStateGraph(plan, executor, config, { checkpointer })

  const pendingBefore = await pendingNodesOf(graph, identity, recursionLimit)
  if (pendingBefore.length === 0) {
    throw new Error(
      `Run '${identity.runId}' has no pending nodes on thread '${identity.threadId}' — it already reached a terminal node of its graph, so there is nothing to resume. Read its state with readRunCheckpoint.`
    )
  }

  let state: AgentSpawnGraphStateValue
  try {
    state = (await graph.invoke(null, runInvokeConfig(identity, recursionLimit))) as AgentSpawnGraphStateValue
  } catch (error) {
    return await outcomeFromRejection(error, graph, identity, checkpointer, resumedFrom, recursionLimit)
  }

  return await outcomeFromResolution(state, graph, plan, identity, checkpointer, resumedFrom, recursionLimit)
}
