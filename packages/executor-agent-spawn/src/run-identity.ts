/**
 * @file run-identity.ts
 * @description A run's identity, and what that identity is for: starting a run
 * under it (`startRun`), so that every checkpoint the run writes is keyed by it.
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
 * **There is no second persistence store here, by construction.** This module
 * owns no storage of its own: it holds no map, writes no file, and keeps no
 * registry of live runs. `startRun` hands the caller's checkpointer to
 * `buildAgentSpawnStateGraph`, and nothing else. Everything durable is
 * LangGraph's own, under the
 * caller's own saver — which is also why durability is exactly as good as the
 * saver passed in: `MemorySaver` does not survive the process, and a
 * SQLite/Postgres saver does. That choice is the caller's, and this package
 * deliberately does not make it on their behalf.
 *
 * **What is not here.** Halting a run, resuming a halted one, and the typed
 * vocabulary for a run's persisted outcome are the next task's surface, not
 * this one's — nothing in this file interrupts, cancels, or restarts anything.
 */

import { randomUUID } from 'node:crypto'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import type { Plan } from '@atta/engine'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
import type { AgentSpawnGraphStateValue } from './graph-state'
import type { SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig, RunIdentity } from './types'

/**
 * The `thread_id` a given run's checkpoints are keyed by. Prefixed rather than
 * used bare so a thread id is self-describing in a checkpointer shared with
 * anything else (another graph, another product) — and derived rather than
 * generated so the mapping is total in both directions: the same `runId`
 * always yields the same thread, on this process and on the next one.
 *
 * Refuses an empty or whitespace-only `runId`. Without that guard every such
 * run would derive the *same* thread id and silently read and overwrite each
 * other's checkpoints — the one identity failure that produces plausible
 * wrong state rather than a missing-state error.
 */
export function threadIdForRun(runId: string): string {
  if (runId.trim() === '') {
    throw new Error(
      'A run id must be a non-empty string — an empty one would key every run to the same checkpoint thread.'
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

/** The initial graph state for a run — every channel at its documented starting value. */
function initialStateFor(identity: RunIdentity): AgentSpawnGraphStateValue {
  return { runId: identity.runId, results: {}, sessions: {}, revisionCounts: {} }
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
  /** Reuse an existing identity (a re-entry, a caller-owned run id); a fresh one is minted otherwise. */
  identity?: RunIdentity
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
  /** The identity every checkpoint this run wrote is keyed by. */
  identity: RunIdentity
  /** The run's final in-memory state, exactly as `invoke()` resolved it. */
  state: AgentSpawnGraphStateValue
}

/**
 * Begins a run: mints (or accepts) its identity, compiles the Plan's graph
 * against the caller's checkpointer, and invokes it bound to that identity's
 * thread.
 *
 * The identity is returned even though the caller may already hold it, because
 * the common case is that it does not — it passed no `identity` and this
 * function minted one, and that `runId` is the only handle to the run's
 * checkpoints afterwards. Persisting it is the caller's job and the one thing
 * a caller of this function must not skip.
 *
 * A failing run throws, exactly as `invoke()` does today — but its checkpoints
 * are already written and still readable by identity, which is the whole point
 * of routing a run through here rather than composing the three calls by hand.
 */
export async function startRun(params: StartRunParams): Promise<StartRunResult> {
  const { plan, config, checkpointer, spawnFn, recursionLimit } = params
  const identity = params.identity ?? createRunIdentity()

  const executor = createAgentLifecycleNodeExecutor(config, spawnFn)
  const graph = buildAgentSpawnStateGraph(plan, executor, config, { checkpointer })

  const state = (await graph.invoke(
    initialStateFor(identity),
    runInvokeConfig(identity, recursionLimit)
  )) as AgentSpawnGraphStateValue

  return { identity, state }
}
