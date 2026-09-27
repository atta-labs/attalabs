/**
 * @file process-lifecycle.ts
 * @description Spawns an agent-spawn node's external process and owns its
 * lifecycle: the timeout that kills a process which never exits, the
 * cancellation request that kills one the caller no longer wants, the
 * escalation from a graceful to a forced signal, and the close/error race
 * that settles its exit. Split out of `node-executor.ts` so this concern —
 * getting one process started and eventually settled — has no knowledge of
 * what that process's stdout means (`stream-reader.ts`).
 *
 * **One state machine, armed at spawn time.** Every listener and every
 * timer this file owns is attached when the process is spawned, not when
 * `waitForExit()` is first awaited, and the first settlement reached wins.
 * That is what makes the timeout-versus-cancellation race decidable rather
 * than dependent on which callback the runtime happened to schedule first:
 * a timeout that has already rejected is not re-reported as a cancellation
 * when the abort lands a tick later, and a cancellation already in flight
 * is not overwritten by the child's own exit code. It also closes a window
 * the earlier per-call registration left open — a process that closed
 * between `spawnProcessLifecycle` returning and `waitForExit()` being
 * called had no `close` listener attached yet, so its exit was missed and
 * the wait ran to the full timeout.
 *
 * **Termination escalates, and is bounded at every step.** A cancellation
 * request and an elapsed timeout are two entries into the same escalation:
 * the graceful signal first, then the forced signal once the graceful one
 * has had `gracefulTerminationMs` to work. Stopping at the graceful signal
 * would leave a child that ignores `SIGTERM` — an agent CLI with its own
 * handler, a shell wrapper that swallows it — running after the run that
 * owned it has already reported itself over. The normative agent-control
 * guidance this package's run surface is modelled on makes that explicit:
 * a long-running autonomous process needs "stopping conditions (such as a
 * maximum number of iterations) to maintain control", and a stopping
 * condition a process can decline is not one. So the forced signal is sent
 * on a deadline the child cannot influence, and the wait settles then
 * whether or not the child ever closes.
 *
 * **What the forced signal cannot reach, stated rather than implied.** The
 * signals go to the direct child and to nothing else. A child that spawned
 * its own descendants (an agent CLI running a build, a shell running a
 * pipeline) leaves those descendants behind, because reaching them needs a
 * process group or job object — a real pid and `detached`-style spawn
 * options, neither of which is representable through `SpawnedProcessLike`
 * or `SpawnFn`, this package's own injectable process seam. Widening that
 * seam is a deliberate separate decision, not something to smuggle in
 * behind a kill call: the seam exists so tests never spawn anything real,
 * and a signature carrying a pid would make a fake process claim one.
 */

import { spawn } from 'node:child_process'

/**
 * The subset of Node's `ChildProcess` this package depends on. Narrowed to
 * an interface (rather than importing `child_process`'s type directly into
 * every call site) so tests can inject a fake process without spawning a
 * real one.
 */
export interface SpawnedProcessLike {
  stdin: { write(chunk: string): void; end(): void } | null
  stdout: { on(event: 'data', listener: (chunk: Buffer | string) => void): void } | null
  stderr: { on(event: 'data', listener: (chunk: Buffer | string) => void): void } | null
  on(event: 'close', listener: (code: number | null) => void): void
  on(event: 'error', listener: (err: Error) => void): void
  kill(signal?: NodeJS.Signals): void
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) => SpawnedProcessLike

export const defaultSpawn: SpawnFn = (command, args, options) =>
  spawn(command, args, options) as unknown as SpawnedProcessLike

/** No `timeoutMs` means the caller never bounds a step's own runtime; the executor still must — a process that never exits must not hang the run forever. Shared with the mechanical executor so both node kinds are bounded identically. */
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

/**
 * How long the graceful signal is given before the forced one follows.
 *
 * Long enough that a well-behaved agent CLI can flush its structured
 * stream and exit on its own — the outcome worth waiting for, since a
 * child that exits by itself leaves no orphaned stdio and no half-written
 * file — and short enough that a cancelled run is felt promptly rather
 * than appearing to hang. It bounds the *termination*, not the step: a
 * step's own bound is `timeoutMs`, and this window opens only once
 * something has already decided the process must end.
 */
export const DEFAULT_GRACEFUL_TERMINATION_MS = 5_000

/** Sent first, so a child that handles it can exit cleanly. */
export const GRACEFUL_TERMINATION_SIGNAL: NodeJS.Signals = 'SIGTERM'

/** Sent once the graceful signal has had its bounded window and the child is still alive. */
export const FORCED_TERMINATION_SIGNAL: NodeJS.Signals = 'SIGKILL'

/**
 * Why a process was terminated, as a value rather than as a message to
 * pattern-match.
 *
 * Two reasons, never one: a run the caller cancelled and a step that
 * outlived its own bound are different facts about different failures, and
 * a caller that retries on one and gives up on the other cannot tell them
 * apart from a string. Both are also distinct from the third way a spawned
 * step stops — an execution failure, which is the child's own doing (it
 * refused to start, or exited non-zero) and is reported as an ordinary
 * `Error`, not as a termination this file performed.
 */
export type ProcessTerminationReason = 'cancelled' | 'timed-out'

/**
 * The `name` a cancellation error carries. A constant because it is also
 * what survives serialization: a checkpoint store keeps a failed task's
 * `{ name, message }` and nothing else, so this string is what a later
 * reader has to recognise a cancelled node by.
 */
export const PROCESS_CANCELLED_ERROR_NAME = 'ProcessCancelledError'

/** The `name` a timeout error carries — see `PROCESS_CANCELLED_ERROR_NAME`. */
export const PROCESS_TIMED_OUT_ERROR_NAME = 'ProcessTimedOutError'

/**
 * A process this file terminated, rather than one that stopped on its own.
 *
 * The shared base exists so a caller can ask the one question that spans
 * both reasons — "did the executor end this process, or did the process
 * end itself?" — with a single `instanceof`, while still having to name a
 * `reason` to act on it. There is deliberately no field common to this and
 * an ordinary execution failure that means "the step did not finish": that
 * is the distinction, and collapsing the three into one thrown `Error` is
 * what this type exists to prevent.
 */
export abstract class ProcessTerminatedError extends Error {
  abstract readonly reason: ProcessTerminationReason
  /** The node whose process was terminated. */
  readonly nodeId: string
  /** That node's declared agent role, as reported in the message. */
  readonly agentRole: string

  protected constructor(message: string, nodeId: string, agentRole: string) {
    super(message)
    this.nodeId = nodeId
    this.agentRole = agentRole
  }
}

export interface ProcessCancelledErrorParams {
  nodeId: string
  agentRole: string
  /** Whether the forced signal had to be sent because the graceful one did not end the process in time. */
  forced: boolean
  /** Whether a process was spawned at all — `false` when the signal was already aborted on entry. */
  spawned: boolean
  /** The abort's own reason, when the caller aborted with a string one. */
  cancellationReason?: string
}

/**
 * A process ended because cancellation was requested — the typed outcome a
 * cancelled run stops on, and never the same value as a timeout or an
 * execution failure.
 *
 * `forced` is on the error rather than in the log because it is the one
 * detail a caller may need to act on: a child that exited on the graceful
 * signal had a chance to finish writing, and one that needed the forced
 * signal did not, so whatever that step was touching may be half-written.
 */
export class ProcessCancelledError extends ProcessTerminatedError {
  readonly reason = 'cancelled' as const
  readonly forced: boolean
  readonly spawned: boolean
  readonly cancellationReason: string | undefined

  constructor(params: ProcessCancelledErrorParams) {
    const { nodeId, agentRole, forced, spawned, cancellationReason } = params
    const how = !spawned
      ? 'cancellation was already requested before its process was spawned'
      : forced
        ? `it was terminated with ${GRACEFUL_TERMINATION_SIGNAL} and then ${FORCED_TERMINATION_SIGNAL} after it did not exit in time`
        : `it exited on ${GRACEFUL_TERMINATION_SIGNAL}`
    super(
      `Agent-spawn node '${nodeId}' (role '${agentRole}') was cancelled: ${how}${
        cancellationReason ? ` (${cancellationReason})` : ''
      }.`,
      nodeId,
      agentRole
    )
    this.name = PROCESS_CANCELLED_ERROR_NAME
    this.forced = forced
    this.spawned = spawned
    this.cancellationReason = cancellationReason
  }
}

/**
 * A process was terminated because its step outlived `timeoutMs`.
 *
 * The message is unchanged from before this error had a class of its own,
 * because it is what callers and tests already match on; the class is what
 * makes the distinction from a cancellation structural rather than textual.
 */
export class ProcessTimedOutError extends ProcessTerminatedError {
  readonly reason = 'timed-out' as const
  /** The bound that elapsed, verbatim from the caller's configuration. */
  readonly timeoutMs: number

  constructor(params: { nodeId: string; agentRole: string; timeoutMs: number }) {
    const { nodeId, agentRole, timeoutMs } = params
    super(
      `Agent-spawn node '${nodeId}' (role '${agentRole}') exceeded its ${timeoutMs}ms timeout and was killed.`,
      nodeId,
      agentRole
    )
    this.name = PROCESS_TIMED_OUT_ERROR_NAME
    this.timeoutMs = timeoutMs
  }
}

/**
 * Children whose lifecycle owner has stopped waiting on them: the forced
 * signal has been delivered and they still have not closed.
 *
 * A `WeakSet` keyed by the child object, held for the lifetime of that
 * object and no longer. This is not a second record of run state — the one
 * thing `run-identity.ts` rules out — it is process-local and says nothing
 * about a run: the question it answers is "is anything still listening to
 * this pipe", which only the process that holds the child can ask and
 * which no checkpoint could answer.
 *
 * It exists because the kill and the stream are owned by different files
 * on purpose. `stream-reader.ts` stops framing when the child closes, but
 * a child that survived the forced signal never closes and can keep
 * writing to a pipe nothing waits on any more — reporting records to an
 * observer for a node whose cancellation was already reported. The file
 * that owns the kill is the only one that knows the wait is over, so it is
 * the one that says so.
 */
const abandonedProcesses = new WeakSet<SpawnedProcessLike>()

/** Marks a child nothing is waiting on any more. Called only after the forced signal has been delivered. */
export function markProcessAbandoned(child: SpawnedProcessLike): void {
  abandonedProcesses.add(child)
}

/** Whether this child's lifecycle owner has given up waiting on it — read by `stream-reader.ts` to stop framing. */
export function isProcessAbandoned(child: SpawnedProcessLike): boolean {
  return abandonedProcesses.has(child)
}

export interface ProcessLifecycleParams {
  spawnFn: SpawnFn
  command: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  timeoutMs: number
  nodeId: string
  agentRole: string
  /**
   * Cancellation input for this process, in the shape a bounded agent
   * runner's own cancellation option takes (`signal – AbortSignal for
   * cancellation`, the normative run-options contract this package's
   * control surface is modelled on). Aborting it terminates the spawned
   * child — graceful signal first, forced signal on a bounded deadline —
   * and settles `waitForExit()` with a `ProcessCancelledError`.
   *
   * A signal already aborted when this function is called spawns nothing
   * at all and throws that same error, so a cancellation that lands in the
   * window between a caller's own check and this call cannot still start a
   * process.
   */
  signal?: AbortSignal
  /**
   * How long the graceful signal is given before the forced one follows.
   * Defaults to `DEFAULT_GRACEFUL_TERMINATION_MS`; injectable so a test
   * can bound termination in milliseconds rather than seconds, the same
   * reason `spawnFn` is injectable.
   */
  gracefulTerminationMs?: number
}

export interface ProcessLifecycleHandle {
  child: SpawnedProcessLike
  /** The cancellation signal this handle is bound to, when the caller supplied one. */
  signal?: AbortSignal
  /**
   * Waits on the process's `close` event, not `exit` — `exit` can fire
   * before stdio streams finish flushing, which would silently truncate a
   * captured stream.
   *
   * Rejects, rather than hanging, on each of the three ways a process can
   * fail to produce a clean exit, and with a different value for each:
   * `ProcessCancelledError` when cancellation was requested,
   * `ProcessTimedOutError` when the step outlived its bound, and an
   * ordinary `Error` when the child could not be spawned at all. Every one
   * of those is bounded: a child that ignores both termination signals
   * settles this promise on the forced-signal deadline regardless.
   */
  waitForExit(): Promise<number>
}

/** The first thing that happened to this process which ends the wait. Whichever is reached first wins. */
type ExitSettlement =
  | { kind: 'closed'; code: number }
  | { kind: 'spawn-failed'; message: string }
  | { kind: 'cancelled'; forced: boolean; cancellationReason?: string }
  | { kind: 'timed-out' }

/**
 * The abort's own reason, but only when the caller aborted with a string.
 *
 * `AbortSignal.reason` defaults to a `DOMException` nobody wrote, so
 * surfacing it unconditionally would paste boilerplate into every
 * cancellation message. A `RunControl` halt is exactly this case: it keeps
 * its human reason on the control handle and calls `abort()` with none, so
 * a cancellation arriving that way reports no reason here and the handle
 * remains where that text lives.
 */
function abortReasonText(signal: AbortSignal | undefined): string | undefined {
  const reason = signal?.reason
  return typeof reason === 'string' && reason.length > 0 ? reason : undefined
}

/**
 * `unref`s a timer where the runtime exposes it, so a forced-termination
 * deadline still pending after the wait has already settled — which is
 * exactly the timeout path, where the escalation deliberately outlives the
 * rejection — cannot by itself hold a process open.
 */
function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    const unrefable = timer as { unref(): void }
    unrefable.unref()
  }
}

/**
 * Spawns one agent-spawn node's process and returns a handle exposing it
 * (so the caller can attach stream listeners and write to stdin before the
 * process is awaited) plus the promise that settles on its exit.
 */
export function spawnProcessLifecycle(params: ProcessLifecycleParams): ProcessLifecycleHandle {
  const {
    spawnFn,
    command,
    args,
    cwd,
    env,
    timeoutMs,
    nodeId,
    agentRole,
    signal,
    gracefulTerminationMs = DEFAULT_GRACEFUL_TERMINATION_MS
  } = params

  // Cancellation that arrived before this call spawns nothing. A caller's
  // own halt boundary may have passed its check a tick earlier; starting a
  // process only to signal it immediately would still run whatever that
  // process does on startup.
  if (signal?.aborted) {
    throw new ProcessCancelledError({
      nodeId,
      agentRole,
      forced: false,
      spawned: false,
      cancellationReason: abortReasonText(signal)
    })
  }

  const child = spawnFn(command, args, { cwd, env })

  let settlement: ExitSettlement | undefined
  /** Waiters registered by `waitForExit` before a settlement was reached. */
  const waiters: Array<() => void> = []
  let terminationStarted = false
  let forcedSignalSent = false
  let cancellationRequested = false
  let cancellationReason: string | undefined
  let forceTimer: ReturnType<typeof setTimeout> | undefined
  /** The step's own bound. Assigned below, once the settlement machinery it calls into exists. */
  let idleTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * Records the first settlement and hands it to anyone waiting. Clears
   * the step's own timeout and detaches the abort listener, but never the
   * forced-termination deadline: on the timeout path that deadline is
   * armed *and* the promise rejects, and cancelling the escalation here
   * would leave a child that ignores the graceful signal running.
   */
  const settleWith = (next: ExitSettlement): void => {
    if (settlement) return
    settlement = next
    clearTimeout(idleTimer)
    signal?.removeEventListener('abort', onAbort)
    for (const waiter of waiters.splice(0)) waiter()
  }

  /** The forced signal, and the point at which nothing waits on this child any more. */
  const escalate = (): void => {
    forcedSignalSent = true
    child.kill(FORCED_TERMINATION_SIGNAL)
    // Delivered the strongest signal a userspace parent has; a child still
    // alive after it is unreachable, so stop waiting and tell the stream
    // reader to stop framing for it.
    markProcessAbandoned(child)
    if (cancellationRequested) {
      settleWith({ kind: 'cancelled', forced: true, cancellationReason })
    }
  }

  /** Graceful signal now, forced signal on a deadline the child cannot influence. Idempotent. */
  const beginTermination = (): void => {
    if (terminationStarted) return
    terminationStarted = true
    child.kill(GRACEFUL_TERMINATION_SIGNAL)
    forceTimer = setTimeout(escalate, gracefulTerminationMs)
    unrefTimer(forceTimer)
  }

  function onAbort(): void {
    if (cancellationRequested) return
    cancellationRequested = true
    cancellationReason = abortReasonText(signal)
    beginTermination()
  }

  idleTimer = setTimeout(() => {
    // Escalation first, settlement second: the rejection tells the caller
    // the step is over, and the escalation it just armed is what makes
    // that true of the process too.
    beginTermination()
    settleWith({ kind: 'timed-out' })
  }, timeoutMs)

  signal?.addEventListener('abort', onAbort, { once: true })

  child.on('error', (err) => {
    clearTimeout(forceTimer)
    settleWith({ kind: 'spawn-failed', message: err.message })
  })

  child.on('close', (code) => {
    clearTimeout(forceTimer)
    // A close that follows a cancellation request is still a cancellation:
    // the child exited because it was signalled, and reporting its exit
    // code as an ordinary result would report a cancelled step as one that
    // ran to completion.
    if (cancellationRequested) {
      settleWith({ kind: 'cancelled', forced: forcedSignalSent, cancellationReason })
      return
    }
    settleWith({ kind: 'closed', code: code ?? 0 })
  })

  return {
    child,
    signal,
    waitForExit: () =>
      new Promise<number>((resolve, reject) => {
        const deliver = (): void => {
          if (!settlement) return
          switch (settlement.kind) {
            case 'closed':
              resolve(settlement.code)
              return
            case 'spawn-failed':
              reject(
                new Error(
                  `Failed to spawn '${command}' for role '${agentRole}' (node '${nodeId}'): ${settlement.message}`
                )
              )
              return
            case 'cancelled':
              reject(
                new ProcessCancelledError({
                  nodeId,
                  agentRole,
                  forced: settlement.forced,
                  spawned: true,
                  cancellationReason: settlement.cancellationReason
                })
              )
              return
            case 'timed-out':
              reject(new ProcessTimedOutError({ nodeId, agentRole, timeoutMs }))
              return
          }
        }

        if (settlement) {
          deliver()
          return
        }
        waiters.push(deliver)
      })
  }
}
