/**
 * @file run-identity.ts
 * @description A run's identity, and the two things that identity is for:
 * starting a run under it (`startRun`) and reading a suspended run's durable
 * state back out under it (`readRunCheckpoint`).
 *
 * **Why this is one module and not three.** A run id, a LangGraph
 * `thread_id`, and a checkpoint read are the same fact seen from three sides.
 * Split across modules, each side acquires its own way of producing the id —
 * a caller generating a `runId` for the initial state, another caller writing
 * `configurable.thread_id` by hand at `invoke()` time, a third reconstructing
 * a thread id to read a checkpoint — and the three only have to disagree once
 * for a run's durable state to become unreachable while still existing. Here,
 * `threadIdForRun` is the single producer, and every other function in this
 * file routes through it.
 *
 * `RunIdentity` is a plain interface, so a caller *can* hand-build one whose
 * `threadId` does not match its `runId` — which would write this run's
 * checkpoints onto another run's thread and make that run's own state
 * unreadable (its `runId` cross-check would then fail), the exact failure the
 * single-producer rule exists to prevent. Structural typing cannot stop that,
 * so both entry points re-derive and compare instead: see
 * `assertDerivedIdentity`. The invariant is enforced on the write path, not
 * merely documented.
 *
 * **There is no second persistence store here, by construction.** This module
 * owns no storage of its own: it holds no map, writes no file, and keeps no
 * registry of live runs. `startRun` hands the caller's checkpointer to
 * `buildAgentSpawnStateGraph`, and `readRunCheckpoint` asks that same
 * checkpointer for a tuple. Everything durable is LangGraph's, under the
 * caller's own saver — which is also why durability is exactly as good as the
 * saver passed in: `MemorySaver` does not survive the process, and a
 * SQLite/Postgres saver does. That choice is the caller's, and this package
 * deliberately does not make it on their behalf.
 *
 * **What the caller's saver ends up holding, stated plainly.** A checkpoint is
 * the whole annotated state, so it includes the `results` channel — and that
 * channel already carries `AgentSpawnNodeResult.events` (the spawned agent's
 * full structured event stream) and `MechanicalNodeResult.stdout`/`stderr`
 * (raw subprocess output, verbatim). Turning a checkpointer on therefore moves
 * that content from process memory to rest, unredacted and unbounded, in
 * whatever store the caller chose. Nothing here redacts it and nothing here
 * caps it: narrowing what is persisted is the event-redaction work's own
 * subject, and this module must not pre-empt it by quietly dropping state a
 * consumer may need. Until then, treat a checkpoint store for these runs as
 * holding the same sensitivity as the agent transcripts themselves — anything
 * a spawned process printed can be in it — and choose its retention,
 * encryption and access accordingly.
 *
 * **What is not here.** The typed control surface itself — a halt handle, a
 * resume that continues from a checkpoint, and the typed outcome a leg of a run
 * resolves to — lives in `run-control.ts` and `run-halt.ts`, built on what this
 * file provides. This file still interrupts, cancels and restarts nothing:
 * `readRunCheckpoint` is a read, `startRun` refuses a thread that already holds
 * a checkpoint rather than restarting it, and the one thing it now forwards
 * towards a halt is the caller's `control` handle, which only a node boundary in
 * `graph-builder.ts` ever acts on.
 */

import { randomUUID } from 'node:crypto'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import type { Plan } from '@atta/engine'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
import type { AgentSpawnGraphStateValue } from './graph-state'
import type { SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig, RunCheckpointState, RunControl, RunIdentity, StepNodeResult } from './types'

/**
 * Characters a run id may contain. Deliberately narrow: the id is interpolated
 * into a checkpointer key, and the saver on the other end is the caller's, with
 * key handling this package cannot see. A path separator can push a file-backed
 * saver outside its own directory, a control character can corrupt a key a
 * text-based saver round-trips, and `:` is this module's own namespace
 * separator — allowing it would make a derived thread id ambiguous to read even
 * though the derivation stays injective. Everything an identifier actually
 * needs (UUIDs, `issue-1075`, `dispatch_42.3`) is inside this set.
 */
const RUN_ID_PATTERN = /^[A-Za-z0-9._-]+$/

/**
 * Upper bound on a run id's length, for the same reason the character set is
 * bounded: a column-backed saver that silently truncates its key would map two
 * distinct long ids onto one thread, which is the collision the whole identity
 * contract exists to rule out. Generous enough for a UUID several times over.
 */
const RUN_ID_MAX_LENGTH = 128

/**
 * The `thread_id` a given run's checkpoints are keyed by. Prefixed rather than
 * used bare so a thread id is self-describing in a checkpointer shared with
 * anything else (another graph, another product) — and derived rather than
 * generated so the mapping is total in both directions: the same `runId`
 * always yields the same thread, on this process and on the next one.
 *
 * Every rejection here is a collision this would otherwise cause downstream,
 * not a style preference. An empty or whitespace-only id would derive the
 * *same* thread for every such run, so they would silently read and overwrite
 * each other's checkpoints — the one identity failure that produces plausible
 * wrong state rather than an honest missing-state error. An over-long or
 * out-of-charset id is refused for the reasons `RUN_ID_MAX_LENGTH` and
 * `RUN_ID_PATTERN` give: both hand the caller's saver a key this package
 * cannot reason about. Refusing at the single producer means no other function
 * in the package has to re-check.
 */
export function threadIdForRun(runId: string): string {
  if (runId.trim() === '') {
    throw new Error(
      'A run id must be a non-empty string — an empty one would key every run to the same checkpoint thread.'
    )
  }
  if (runId.length > RUN_ID_MAX_LENGTH) {
    throw new Error(
      `A run id must be at most ${RUN_ID_MAX_LENGTH} characters — a longer one risks being truncated by the caller's checkpoint store, which would key two distinct runs to one thread.`
    )
  }
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error(
      `A run id may contain only letters, digits, '.', '_' and '-' — '${runId}' does not, and it is interpolated into a checkpoint key whose store may treat separators or control characters structurally.`
    )
  }
  return `agent-spawn-run:${runId}`
}

/**
 * The complete identity for a run whose `runId` is already known — the
 * process-restart path. A caller that persisted nothing but the `runId` calls
 * this and gets back an identity that resolves the very checkpoints the
 * pre-restart process wrote, because `threadIdForRun` is pure.
 */
export function runIdentityForRunId(runId: string): RunIdentity {
  return { runId, threadId: threadIdForRun(runId) }
}

/**
 * A fresh identity for a new run. The `runId` is a v4 UUID unless the caller
 * supplies its own — a caller that already has a run identifier it must
 * correlate against (an Issue number, a dispatch id, its own primary key)
 * passes it here rather than generating a second one and having to map between
 * them.
 */
export function createRunIdentity(runId: string = randomUUID()): RunIdentity {
  return runIdentityForRunId(runId)
}

/**
 * Refuses an identity whose `threadId` is not the one its own `runId` derives.
 * Called by both entry points, because a `RunIdentity` is an ordinary
 * structurally-typed object and nothing stops a caller from assembling the two
 * fields independently — deliberately or by copying one field from the wrong
 * variable. A mismatched identity is never a harmless typo: on the write path
 * it files this run's checkpoints under another run's thread, and that run's
 * own `readRunCheckpoint` then throws on the `runId` cross-check, so its
 * durable state becomes unreadable while still existing.
 *
 * Re-deriving also closes the bypass every other guard would otherwise have:
 * an identity assembled by hand never passed through `threadIdForRun`, so
 * without this call the empty-id, length and charset refusals above would
 * apply only to identities built through this module's own constructors.
 */
export function assertDerivedIdentity(identity: RunIdentity): void {
  const derived = threadIdForRun(identity.runId)
  if (identity.threadId !== derived) {
    throw new Error(
      `Run identity is inconsistent: runId '${identity.runId}' derives thread '${derived}', but the identity carries thread '${identity.threadId}'. Build identities with createRunIdentity or runIdentityForRunId — a hand-assembled pair can write one run's checkpoints onto another run's thread.`
    )
  }
}

/**
 * The LangGraph invocation config for a run — the one place
 * `configurable.thread_id` is ever written in this package.
 *
 * Typed as a local interface rather than `RunnableConfig` so this package
 * takes no `@langchain/core` dependency for a two-field object; it is
 * structurally assignable to what `invoke()` accepts.
 */
export interface RunInvokeConfig {
  configurable: { thread_id: string }
  recursionLimit?: number
}

/** Builds the invocation/read config that binds a call to one run's thread. */
export function runInvokeConfig(identity: RunIdentity, recursionLimit?: number): RunInvokeConfig {
  const config: RunInvokeConfig = { configurable: { thread_id: identity.threadId } }
  if (recursionLimit !== undefined) config.recursionLimit = recursionLimit
  return config
}

/**
 * The initial graph state for a run — every channel at its documented starting
 * value. Exported so every start path builds it identically: a channel omitted
 * on one path and present on another is how two entry points to the same graph
 * start diverging.
 */
export function initialRunState(identity: RunIdentity): AgentSpawnGraphStateValue {
  return { runId: identity.runId, results: {}, sessions: {}, revisionCounts: {}, outcome: undefined }
}

export interface StartRunParams {
  plan: Plan
  config: AgentSpawnExecutorConfig
  /**
   * Required, unlike on `buildAgentSpawnStateGraph` — a run started through
   * this entry point is by definition a run whose state is meant to outlive
   * the call, and an optional checkpointer here would let the single most
   * important property of `startRun` be omitted silently.
   */
  checkpointer: BaseCheckpointSaver
  /**
   * Run under an identity the caller already holds — typically one built from
   * its own identifier (`createRunIdentity('issue-1075')`). Omitted, a fresh
   * one is minted. This is **not** a resume handle: `startRun` always begins
   * at the Plan's entry node, and it refuses outright if this identity's
   * thread already holds a checkpoint. Resuming is the next task's surface.
   */
  identity?: RunIdentity
  /**
   * Called with the run's identity *before* the graph is invoked — the one
   * reliable way for a caller that let `startRun` mint the id to learn it even
   * if the run then fails. `StartRunResult` only materialises on success, so
   * without this a minted `runId` would be lost with the rejection, and a
   * rejected run is exactly the suspended run whose checkpoints someone wants
   * to inspect afterwards. `runIdentityOf(error)` recovers the same value from
   * the thrown error; this callback additionally covers a throw that is not an
   * `Error` at all, and fires while the run is still in flight.
   *
   * Anything it throws propagates, before the run starts — a caller whose
   * "record this run id" step fails should not get an unrecorded run.
   */
  onIdentity?: (identity: RunIdentity) => void
  /**
   * A halt handle for this run, forwarded to the node executor. Supplied, the
   * run stops at its next node boundary once `control.halt()` fires; omitted,
   * nothing can stop it short of a node failing.
   *
   * `startRun` still *throws* on a halt, as it does on any node failure — it
   * has one non-throwing shape and reporting a halt as a typed outcome is
   * `startControlledRun`'s job (`run-control.ts`). What this parameter buys a
   * direct `startRun` caller is that the halt is possible at all, and that its
   * error is recognisable with `runHaltOf`.
   */
  control?: RunControl
  /** Test/injection seam, forwarded to `createAgentLifecycleNodeExecutor` unchanged. */
  spawnFn?: SpawnFn
  /**
   * Forwarded to `invoke()` when supplied. `startRun` owns the invocation
   * config, so without this passthrough it would silently take away a
   * ceiling a caller of `buildAgentSpawnStateGraph` could previously set for
   * itself — a `decision`-bearing Plan that loops legally can exceed
   * LangGraph's default.
   */
  recursionLimit?: number
}

export interface StartRunResult {
  /** The identity every checkpoint this run wrote is keyed by — hand it to `readRunCheckpoint`. */
  identity: RunIdentity
  /** The run's final in-memory state, exactly as `invoke()` resolved it. */
  state: AgentSpawnGraphStateValue
}

/**
 * An error thrown out of `startRun`, carrying the identity of the run that
 * failed. Read it with `runIdentityOf` rather than by property access, so a
 * caller never has to widen the `unknown` a `catch` gives it.
 */
export interface RunFailure extends Error {
  identity: RunIdentity
}

/**
 * The identity of the run a caught error came from, or `undefined` for an error
 * that is not one of ours. This is the recovery path for a run that failed
 * under a minted identity: its checkpoints are written and readable, and this
 * is how a caller gets the handle to read them.
 */
export function runIdentityOf(error: unknown): RunIdentity | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = (error as { identity?: unknown }).identity
  if (typeof candidate !== 'object' || candidate === null) return undefined
  const { runId, threadId } = candidate as { runId?: unknown; threadId?: unknown }
  if (typeof runId !== 'string' || typeof threadId !== 'string') return undefined
  return { runId, threadId }
}

/**
 * Refuses to begin a run on a thread that already holds a checkpoint. Shared by
 * every start path so the refusal, and the reason for it, are stated once.
 *
 * A start always begins at the Plan's entry node, so beginning a second time
 * under one identity would re-execute completed steps — spawning their
 * subprocesses again — while the keyed-merge reducers preserved the earlier
 * attempt's entries for every node the second never reached. The checkpoint
 * would then hold two attempts blended into one run's state with nothing
 * marking the seam, and `revisionCounts` would be worse than stale: the
 * executor increments from the checkpointed value, so a `decision`-bearing Plan
 * could hit its `maxRevisions` ceiling on the retry's first step.
 *
 * Continuing an existing run is `resumeControlledRun`'s job, and it is a
 * different operation precisely because it starts from the checkpoint rather
 * than from the entry node.
 */
export async function assertNoExistingCheckpoint(
  checkpointer: BaseCheckpointSaver,
  identity: RunIdentity
): Promise<void> {
  const existing = await checkpointer.getTuple(runInvokeConfig(identity))
  if (existing) {
    throw new Error(
      `Run '${identity.runId}' already has a checkpoint on thread '${identity.threadId}' — a start always begins at the Plan's entry node, so continuing here would re-execute completed steps and blend two attempts into one run's state. Mint a new identity to start a new run, resume this one with resumeControlledRun, or just read its state with readRunCheckpoint.`
    )
  }
}

/**
 * Begins a run: mints (or accepts) its identity, compiles the Plan's graph
 * against the caller's checkpointer, and invokes it bound to that identity's
 * thread.
 *
 * **The identity is surfaced before the run, not only after it.** It is
 * reported to `onIdentity` and attached to any thrown error (`runIdentityOf`)
 * as well as returned in `StartRunResult`, because the resolved result exists
 * only when the run succeeded — and a *failed* run is precisely the suspended
 * run whose checkpoints are worth reading. Returning the identity alone would
 * have made the minted-id path lose its only handle to state that had already
 * been written, which is this task's named failure mode. Persisting the `runId`
 * remains the caller's job and the one thing a caller must not skip.
 *
 * **A thread that already holds a checkpoint is refused, not restarted** — see
 * `assertNoExistingCheckpoint` for why that blend of two attempts is worse than
 * an honest refusal. A caller that wants a genuinely new run mints a new
 * identity; one that wants to continue the existing run calls
 * `resumeControlledRun`; one that only wants its state calls
 * `readRunCheckpoint`.
 *
 * **It throws rather than reporting an outcome.** A halt, a node failure and an
 * exhausted revision ceiling all surface here as a rejection or an ordinary
 * resolution, with nothing distinguishing them — telling them apart is
 * `startControlledRun`'s job (`run-control.ts`), which is the entry point to
 * prefer when the caller needs to know *why* a run stopped.
 */
export async function startRun(params: StartRunParams): Promise<StartRunResult> {
  const { plan, config, checkpointer, spawnFn, control, recursionLimit, onIdentity } = params
  const identity = params.identity ?? createRunIdentity()
  assertDerivedIdentity(identity)

  onIdentity?.(identity)

  await assertNoExistingCheckpoint(checkpointer, identity)

  const executor = createAgentLifecycleNodeExecutor(config, spawnFn, { control })
  const graph = buildAgentSpawnStateGraph(plan, executor, config, { checkpointer })

  try {
    const state = (await graph.invoke(
      initialRunState(identity),
      runInvokeConfig(identity, recursionLimit)
    )) as AgentSpawnGraphStateValue

    return { identity, state }
  } catch (err) {
    // Attach rather than wrap: the node executors' own messages are what a
    // caller matches on, and re-throwing the original error keeps its message,
    // type and stack intact. An identity already attached by a nested call is
    // left alone — the innermost run is the more specific answer.
    if (err instanceof Error && runIdentityOf(err) === undefined) {
      ;(err as RunFailure).identity = identity
    }
    throw err
  }
}

/** Whether a checkpointed value is one of this package's two recorded node results. */
function isStepNodeResult(value: unknown): value is StepNodeResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as { kind?: unknown; nodeId?: unknown; exitCode?: unknown }
  if (candidate.kind !== 'agent-spawn' && candidate.kind !== 'mechanical') return false
  return typeof candidate.nodeId === 'string' && typeof candidate.exitCode === 'number'
}

/** Whether a checkpointed value is a recorded resumable session id. */
function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

/** Whether a checkpointed value is a per-node execution count. */
function isRevisionCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/**
 * Narrows one checkpointed channel to a keyed record without `any` and without
 * trusting the checkpoint's shape — including its *entries*, not just the
 * container. `channel_values` is `Record<string, unknown>` (LangGraph does not
 * type it against this package's annotation), and the store it came from may be
 * shared with other writers or have been tampered with, so a cast alone would
 * let a fabricated entry — any `kind`, `exitCode: 0` — be narrowed and then
 * trusted as this run's recorded outcome. Every value is checked, and an
 * unrecognised one throws naming its channel and key rather than being dropped:
 * silently omitting an entry would report a node as never having run, which is
 * the same misreading in the other direction.
 *
 * A channel that is absent (never written) or not an object reads as the empty
 * record rather than throwing — a run suspended before any node completed has
 * legitimately empty `results`, and that is not a corruption.
 */
function keyedChannel<T>(
  values: Record<string, unknown>,
  channel: string,
  isValid: (value: unknown) => value is T
): Record<string, T> {
  const value = values[channel]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const entries = Object.entries(value as Record<string, unknown>)
  for (const [key, entry] of entries) {
    if (!isValid(entry)) {
      throw new Error(
        `Checkpointed '${channel}' entry '${key}' is not a valid ${channel} value — refusing to narrow an unrecognised checkpoint entry into this run's state.`
      )
    }
  }
  return Object.fromEntries(entries) as Record<string, T>
}

/**
 * Reads a run's checkpointed state back using only the checkpointer and the
 * run's identity — no second store, and no replay of the run.
 *
 * Returns `undefined` when this identity has no checkpoint: an unknown run, or
 * one whose saver did not outlive the process that wrote it. That is an
 * ordinary answer, not an error — the caller asked whether state exists.
 *
 * Two shapes of corruption are refused rather than read. A checkpoint on this
 * thread that records a *different* `runId` can only come from a colliding key,
 * and returning its channels as this run's would be the misinterpretation of
 * durable state this function exists to prevent. An entry in any channel that
 * is not a value this package could have written is refused the same way — see
 * `keyedChannel`.
 *
 * `results` comes back exactly as the graph recorded it, captured subprocess
 * output and agent event streams included — see this file's header for what
 * that means for the store holding it.
 */
export async function readRunCheckpoint(
  checkpointer: BaseCheckpointSaver,
  identity: RunIdentity
): Promise<RunCheckpointState | undefined> {
  assertDerivedIdentity(identity)

  const tuple = await checkpointer.getTuple(runInvokeConfig(identity))
  if (!tuple) return undefined

  const values = tuple.checkpoint.channel_values as Record<string, unknown>
  const checkpointedRunId = values.runId
  if (typeof checkpointedRunId !== 'string' || checkpointedRunId !== identity.runId) {
    throw new Error(
      `Checkpoint on thread '${identity.threadId}' records runId '${String(checkpointedRunId)}', not '${identity.runId}' — refusing to read another run's state as this one's.`
    )
  }

  return {
    identity,
    checkpointId: tuple.checkpoint.id,
    checkpointedAt: tuple.checkpoint.ts,
    results: keyedChannel(values, 'results', isStepNodeResult),
    sessions: keyedChannel(values, 'sessions', isSessionId),
    revisionCounts: keyedChannel(values, 'revisionCounts', isRevisionCount)
  }
}
