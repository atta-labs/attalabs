/**
 * @file run-halt.ts
 * @description The halt primitive — a caller-held handle that stops a run at
 * the earliest point it can, refusing the next node and terminating a child
 * already running — and the distinguished error it throws.
 *
 * **Why an `AbortSignal` and not a bespoke flag.** The normative bounded-runner
 * contract this package's control surface is modelled on takes cancellation as
 * an `AbortSignal` run option (`signal – AbortSignal for cancellation`, the
 * OpenAI Agents SDK's own `run()` options table). Exposing the same shape means
 * a caller that already holds an `AbortController` for the surrounding request
 * hands its signal straight in (`createRunControl(request.signal)`) instead of
 * bridging two cancellation vocabularies, and a caller with no upstream signal
 * still gets one it can pass to its own abortable work.
 *
 * **What a halt is here, exactly.** It stops the run at the earliest place it
 * can, and there are two of those. A node that has not started yet is refused
 * at its boundary: the wrapper throws `RunHaltedError` before it emits
 * `node:start` or reaches either executor, so nothing is spawned. A node whose
 * child process is *already running* is stopped by terminating that child —
 * `graph-builder.ts` forwards the handle's `signal` into both executors
 * (`executeAgentSpawnNode` and `executeMechanicalNode`, since a mechanical
 * node's command holds the same working directory and permissions an agent's
 * child does), the process-lifecycle seam signals the child gracefully and then
 * forcibly on a bounded deadline, and the resulting `ProcessCancelledError` is
 * reported as a halt (`terminatedProcess: true`) carrying that cancellation as
 * its `cause`. The one cancellation that reports `terminatedProcess: false` is
 * the one that arrived before its process was spawned at all
 * (`ProcessCancelledError.spawned` is `false`): nothing ran, so nothing on disk
 * needs inspecting.
 *
 * **Why the mid-flight case kills rather than waits.** Leaving the child alive
 * was the earlier behaviour and it was wrong in a way a caller could not see: a
 * run the caller believed cancelled kept an agent process running, with the
 * filesystem and execution permissions it was granted, until the node's own
 * `timeoutMs` elapsed — ten minutes (`DEFAULT_TIMEOUT_MS`) when its role
 * declares none. The objection to killing it is real but smaller: a child cut
 * off mid-write leaves partial effects on disk that the run's recorded state
 * does not describe, so a resume re-enters that node on top of them. That is
 * already true of the timeout path, which has always killed mid-write, so the
 * halt path was not protecting an invariant the package actually held — it was
 * the only path that let an unwanted agent keep working. Both costs are the
 * caller's to weigh, and `RunHaltedError.terminatedProcess` is what lets it:
 * `false` means nothing was running and a resume is blind-safe, `true` means
 * inspect first.
 *
 * **It needs no new outcome reason.** A halt that terminated a child is still a
 * halt, so it reports `paused` exactly as a boundary halt does, and `runHaltOf`
 * recognises it by the same `instanceof`. Introducing a sixth `cancelled`
 * reason for it would have said the run stopped for some *other* cause than the
 * caller's own `halt()`, which is not true, and would have made every existing
 * consumer of the five-reason vocabulary handle a case that is not new.
 *
 * **Either way the halt is resumable, and for the same reason.** LangGraph
 * commits one checkpoint per superstep, so the last completed node's result is
 * durable and the node that threw — refused at its boundary or cut off
 * mid-flight — is left pending on the thread, which is exactly the position a
 * resume continues from, with no completed node re-executed. Throwing is what
 * produces that; returning would let LangGraph route onward as though the node
 * had run. What differs between the two is not resumability but what the node
 * leaves behind on disk, which is what `terminatedProcess` reports.
 *
 * **A halt is not a failure and is never reported as one.** `runHaltOf` is how
 * the control operations tell the two apart when `invoke()` rejects, so a
 * halted run resolves to a `paused` outcome and a genuinely broken one to
 * `failed` — see `run-control.ts`.
 */

import { sanitizeReasonText } from './reason-text'
import type { RunControl } from './types'

/**
 * Reason recorded when an upstream `AbortSignal` — rather than a direct
 * `halt()` call — is what stopped the run. Stated as the reason rather than
 * left blank so a paused run's recorded cause names the mechanism that halted
 * it, which is the whole point of carrying a reason at all.
 */
const UPSTREAM_HALT_REASON = 'the upstream AbortSignal passed to createRunControl was aborted'

/**
 * A fresh halt handle. Pass the returned control to `startControlledRun` /
 * `resumeControlledRun`, keep it, and call `halt()` on it to stop the run at
 * its next node boundary.
 *
 * `upstream`, when supplied, is linked one-way: aborting it halts this run, and
 * halting this run does not abort it. One-way because the upstream signal is
 * the caller's and may be shared with work this run knows nothing about —
 * propagating a halt outward would cancel that too.
 *
 * An `upstream` that is *already* aborted halts immediately rather than being
 * ignored, so a control created after the abort behaves the same as one created
 * before it. A caller that starts a run with such a control gets a `paused`
 * outcome with the entry node pending and nothing spawned.
 */
export function createRunControl(upstream?: AbortSignal): RunControl {
  const controller = new AbortController()
  let haltReason: string | undefined

  /**
   * First halt wins. A second call is a no-op rather than an overwrite,
   * because the reason worth recording is the one that actually stopped the
   * run — a later call's reason describes a halt that changed nothing.
   *
   * The reason is sanitized here, at the one point a caller's own text enters
   * this handle, for the reason `reason-text.ts` states: `haltReason` is read
   * back into a `RunHaltedError`'s message, which LangGraph persists on the
   * thread and a consumer renders — so an unbounded or newline-carrying reason
   * forges log records and bloats every later checkpoint write. A reason left
   * empty by that treatment (one that was nothing but control characters) is
   * recorded as no reason at all rather than as a blank one, so a halt message
   * reads the same as a halt given no reason.
   */
  const halt = (reason?: string): void => {
    if (controller.signal.aborted) return
    const safe = reason === undefined ? undefined : sanitizeReasonText(reason)
    haltReason = safe !== undefined && safe.length > 0 ? safe : undefined
    controller.abort()
  }

  if (upstream) {
    if (upstream.aborted) halt(UPSTREAM_HALT_REASON)
    else upstream.addEventListener('abort', () => halt(UPSTREAM_HALT_REASON), { once: true })
  }

  return {
    signal: controller.signal,
    get halted() {
      return controller.signal.aborted
    },
    get haltReason() {
      return haltReason
    },
    halt
  }
}

/**
 * The `name` a halt error carries, and the only part of a halt that survives
 * serialization into a checkpoint store: LangGraph persists a failed task's
 * error as `{ name, message }`, and this is what `readRunOutcome` matches on to
 * report a halted run as `paused` rather than `failed`. A constant rather than a
 * repeated literal because the two sides must agree exactly, and a rename that
 * only touched one of them would silently reclassify every halted run.
 */
export const RUN_HALTED_ERROR_NAME = 'RunHaltedError'

/**
 * The fixed opening of every `RunHaltedError` message, and the second half of
 * what a *serialized* halt has to look like.
 *
 * A checkpoint store keeps only a failed task's `name` and `message`, so the
 * read-back path cannot use `instanceof` the way the in-memory path does. Matching
 * the name alone was too weak: caller code runs inside this graph — a
 * `decisionPredicate`, a `buildArgs`, a `spawnFn` — and any of it can throw an
 * error it has named `RunHaltedError`, which would then read back as a deliberate
 * pause and invite a resume into a node that actually broke. Requiring the message
 * shape as well closes that accident. It does not close deliberate forgery by
 * something with write access to the store, and cannot: at that point the store is
 * lying about the run's state generally, which is the trust boundary
 * `run-identity.ts` already documents.
 */
export const RUN_HALTED_MESSAGE_PREFIX = 'Run halted before node '

/**
 * Thrown when a halted run stops at a node — either a boundary refusing to
 * start one, or a started one whose live child process was terminated.
 *
 * Carries the node it stopped, which in both cases is the node a resume will
 * execute first, so it is the useful half of the report rather than a
 * decoration. `terminatedProcess` says which of the two happened.
 */
export class RunHaltedError extends Error {
  /** The node the halt stopped, and which a resume will run first. */
  readonly nodeId: string
  /** The reason passed to `halt()`, when the caller gave one. */
  readonly haltReason: string | undefined
  /**
   * Whether this halt stopped a node that had *already started* by
   * terminating its live child process, rather than refusing one that had
   * not started yet.
   *
   * `false` is the boundary case above, and the common one. `true` is the
   * mid-flight case: the halt reached `process-lifecycle.ts` through the
   * node's own cancellation signal, the child was signalled and is dead, and
   * the `ProcessCancelledError` that reports how it died is this error's
   * `cause`. Both leave the node pending and both are honestly a halt, but
   * only one of them leaves whatever that child was writing half-written —
   * so a caller deciding whether to resume blind or inspect the working tree
   * first needs to be able to tell them apart, and a single boolean on the
   * error it already catches is where it can.
   */
  readonly terminatedProcess: boolean

  constructor(nodeId: string, haltReason?: string, options?: { cause?: unknown; terminatedProcess?: boolean }) {
    const terminatedProcess = options?.terminatedProcess === true
    // The fixed prefix is what `describesRunHalt` matches a serialized halt
    // on, so it opens both messages; only what follows the node id differs.
    const what = terminatedProcess ? 'completed: its live child process was terminated' : 'started'
    super(
      `${RUN_HALTED_MESSAGE_PREFIX}'${nodeId}' ${what}${haltReason ? `: ${haltReason}` : ''}. No completed node's work is lost — the last checkpoint holds it, and resuming continues from this node.`,
      options && 'cause' in options ? { cause: options.cause } : undefined
    )
    this.name = RUN_HALTED_ERROR_NAME
    this.nodeId = nodeId
    this.haltReason = haltReason
    this.terminatedProcess = terminatedProcess
  }
}

/** Anything carrying an `errors` array — `AggregateError` without naming its class. */
function aggregatedErrors(value: unknown): unknown[] | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const errors = (value as { errors?: unknown }).errors
  return Array.isArray(errors) ? errors : undefined
}

/**
 * The `RunHaltedError` a caught error is, carries as a `cause`, or aggregates —
 * and `undefined` for anything that is not, or is not *only*, a halt.
 *
 * Three shapes, because a halt reaches a caller through `graph.invoke()`'s
 * rejection and LangGraph decides what that rejection looks like:
 *
 * - The halt itself, when one node's boundary refused.
 * - A wrapper carrying it as `cause`. Walked rather than tested once, because a
 *   layer that wrapped the halt would otherwise turn it into a reported failure
 *   — the single misclassification this distinction exists to prevent.
 * - An `AggregateError`, which is what LangGraph raises when several tasks in one
 *   superstep fail at once ("Multiple errors occurred during superstep N"). A
 *   fan-out halted mid-flight produces exactly this: every parallel branch's
 *   boundary refuses in the same superstep, so a detector that only looked at the
 *   top-level error would report a deliberately halted fan-out as broken.
 *
 * An aggregate counts as a halt **only if every error inside it is one.** A
 * superstep where one branch was halted and another genuinely broke is a failed
 * run, not a paused one: the failure is the fact the caller has to act on, and
 * reporting it as a pause would invite a resume that re-enters a broken node.
 *
 * Depth-bounded and cycle-guarded, so a self-referential `cause` or a
 * self-containing aggregate cannot spin. The guard tracks the *current path*
 * only, and each branch of an aggregate is walked with its own copy: a shared
 * set would make the second sighting of one error return `undefined` purely
 * because a sibling had already been visited, so an aggregate carrying the same
 * halt reference twice — a fan-out where two boundaries threw the same object —
 * would fail the all-errors-are-halts test and report a fully halted run as
 * broken. A repeat along one path is a cycle; a repeat across siblings is not.
 *
 * Shaped after `runIdentityOf` in `run-identity.ts`: both answer "what does this
 * caught `unknown` tell me about the run it came from", and both return
 * `undefined` for an error that is not ours, so a caller never has to widen what
 * a `catch` handed it.
 */
export function runHaltOf(
  error: unknown,
  path: ReadonlySet<unknown> = new Set(),
  depth = 0
): RunHaltedError | undefined {
  if (depth > 8 || path.has(error)) return undefined

  if (error instanceof RunHaltedError) return error

  const descend = new Set(path)
  if (typeof error === 'object' && error !== null) descend.add(error)

  const aggregated = aggregatedErrors(error)
  if (aggregated) {
    if (aggregated.length === 0) return undefined
    let first: RunHaltedError | undefined
    for (const inner of aggregated) {
      const halt = runHaltOf(inner, new Set(descend), depth + 1)
      if (!halt) return undefined
      first ??= halt
    }
    return first
  }

  if (!(error instanceof Error)) return undefined
  return runHaltOf(error.cause, descend, depth + 1)
}

/**
 * Whether a *serialized* error — all a checkpoint store keeps of one — describes
 * a halt this package threw.
 *
 * The read-back counterpart to `runHaltOf`, and deliberately stricter than a name
 * comparison: see `RUN_HALTED_MESSAGE_PREFIX` for what that strictness buys and
 * what it cannot.
 */
export function describesRunHalt(error: { name?: unknown; message?: unknown }): boolean {
  if (error.name !== RUN_HALTED_ERROR_NAME) return false
  return typeof error.message === 'string' && error.message.startsWith(RUN_HALTED_MESSAGE_PREFIX)
}

/**
 * The message worth reporting for a rejection that is not a halt — the failing
 * node's own text, dug out of whatever LangGraph wrapped it in.
 *
 * Needed because a superstep with two or more failed tasks rejects with an
 * `AggregateError` whose own message is only `Multiple errors occurred during
 * superstep N. See the "errors" field of this exception for more details.` — it
 * names no node and carries no cause, so a caller reading it learns nothing about
 * what broke, while the same run's persisted error write holds the real message.
 * The two must not disagree about the same fact.
 *
 * Inside an aggregate the first error that is *not* a halt is the one reported: a
 * superstep mixing a halt with a genuine break is a failed run, and the break is
 * the fact the caller has to act on. An aggregate of nothing but halts should not
 * reach here at all (`runHaltOf` claims it first), so its own message is the
 * honest fallback rather than a silently-picked halt.
 */
export function failureMessageOf(error: unknown, path: ReadonlySet<unknown> = new Set(), depth = 0): string {
  if (depth > 8 || path.has(error)) return 'the error carried no readable message'
  if (!(error instanceof Error)) return String(error)

  const descend = new Set(path)
  descend.add(error)

  const aggregated = aggregatedErrors(error)
  if (aggregated) {
    for (const inner of aggregated) {
      if (runHaltOf(inner) !== undefined) continue
      return failureMessageOf(inner, new Set(descend), depth + 1)
    }
  }
  return error.message
}
