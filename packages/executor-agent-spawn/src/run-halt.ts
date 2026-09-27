/**
 * @file run-halt.ts
 * @description The halt primitive — a caller-held handle that stops a run at
 * its next node boundary — and the distinguished error that boundary throws.
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
 * **What a halt is here, exactly.** It stops the run *between* nodes: the node
 * currently executing is left alone to finish and record its result, and the
 * next node to be scheduled throws `RunHaltedError` before it starts. It is
 * deliberately **not** process-level cancellation of a live spawned child —
 * killing a mid-flight agent CLI belongs to the process-lifecycle seam
 * (`process-lifecycle.ts`, which already accepts a `signal` for that purpose
 * and does not act on it yet), and doing it from here would terminate a
 * subprocess whose partial effects on the working tree nothing has recorded.
 *
 * That boundary choice is what makes a halt resumable rather than merely
 * destructive. LangGraph commits one checkpoint per superstep, so the last
 * completed node's result is durable and the node that threw is left pending on
 * the thread — which is exactly the position a resume continues from, with no
 * completed node re-executed. A halt that killed a child mid-write would leave
 * no such clean seam: the run's recorded state would say the node never
 * completed while its side effects on disk said otherwise.
 *
 * **A halt is not a failure and is never reported as one.** `runHaltOf` is how
 * the control operations tell the two apart when `invoke()` rejects, so a
 * halted run resolves to a `paused` outcome and a genuinely broken one to
 * `failed` — see `run-control.ts`.
 */

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
   */
  const halt = (reason?: string): void => {
    if (controller.signal.aborted) return
    haltReason = reason
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
 * Thrown by a node boundary that refuses to start because the run was halted.
 *
 * Carries the node it stopped *before* — never a node it stopped in the middle
 * of, since a halt never interrupts a node already running. That id is the node
 * a resume will execute first, so it is the useful half of the report rather
 * than a decoration.
 */
export class RunHaltedError extends Error {
  /** The node that was about to start, and which a resume will run first. */
  readonly nodeId: string
  /** The reason passed to `halt()`, when the caller gave one. */
  readonly haltReason: string | undefined

  constructor(nodeId: string, haltReason?: string) {
    super(
      `Run halted before node '${nodeId}' started${haltReason ? `: ${haltReason}` : ''}. No completed node's work is lost — the last checkpoint holds it, and resuming continues from this node.`
    )
    this.name = RUN_HALTED_ERROR_NAME
    this.nodeId = nodeId
    this.haltReason = haltReason
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
