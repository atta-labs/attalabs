/**
 * @file types.ts
 * @description Public types for this executor: the caller-supplied
 * configuration for each node kind, and the structured result each executed
 * node produces.
 *
 * Both node kinds resolve a *name* declared in the Plan to something
 * spawnable that only the caller knows. An agent-spawn node names a role
 * (`PlanAgentSpawnNode.agentRole`), never a binary; a mechanical node names
 * an action (`PlanMechanicalNode.action`), never a command line. The caller
 * resolves them via `roleBinaries` / `mechanicalActions` below, because what
 * is present on one machine may be absent on another — and because a name
 * the caller has not declared up front must never become a spawned process.
 */

/**
 * Parameters the caller's `buildArgs` receives to construct the CLI's argv
 * for one invocation. The executor never hardcodes a flag syntax — every
 * CLI (`claude -p`, `codex exec`, ...) has its own, so the caller owns it.
 */
export interface RoleBinaryArgsParams {
  /** The step's declared permission scope, verbatim from the Plan. */
  permission: string
  /** The step's declared turn ceiling, verbatim from the Plan. */
  maxTurns: number
  /** Prior session id to resume, when the step declares `resume`. */
  resumeSessionId?: string
}

/**
 * How a single role resolves to a spawnable process. Supplied by the
 * caller at executor-construction time — never read from the Plan or from
 * `@atta/engine`, and never a vendor API key: the spawned process
 * authenticates via its own already-logged-in subscription session.
 */
export interface RoleBinaryConfig {
  /** Executable to spawn, e.g. "claude", "codex". */
  command: string
  /** Builds the full argv (excluding the command itself) for one invocation. */
  buildArgs: (params: RoleBinaryArgsParams) => string[]
  /**
   * Non-empty allowlist of permission values this role accepts, checked
   * against the step's declared `permission` before `buildArgs` ever sees
   * it. Required, not optional: this package is vendor-agnostic and cannot
   * hardcode which permission strings a given CLI actually supports, but
   * shipping with no enforcement at all let an unconstrained free string
   * reach the spawned process unexamined — the caller, who does know its
   * CLI's valid values, is the only one who can supply this list.
   */
  allowedPermissions: string[]
  /** Extra environment variables merged into the spawned process's environment, after the executor's own env allowlist (see `AgentSpawnExecutorConfig.envAllowlist`). */
  env?: Record<string, string>
  /**
   * Kills the process and rejects if it hasn't closed within this many
   * milliseconds. Defaults to `10` minutes when omitted — a hung process
   * is always eventually killed, never waited on indefinitely.
   */
  timeoutMs?: number
}

/**
 * One node-lifecycle transition, emitted while a Plan is executing: a node
 * started, (agent-spawn only) one thing the spawned process reported on its
 * structured stream, a node completed, or a node failed. `runId` correlates
 * every event a run produces — task 6's own reason for existing — so an
 * observer watching a nested or concurrent execution can place an event
 * within its enclosing run, not just against the bare node id.
 *
 * Deliberately shape-matched, member for member, to `FlowEvent`'s node-scoped
 * variants in `packages/ui/engine-flow/events.ts` — the sole event vocabulary
 * this repo treats as authoritative for a flow diagram — rather than a
 * second, independently-designed one. It is not *imported* from there: this
 * package is a pure Node executor with no UI dependency (mirroring
 * `packages/adapter-langgraph`, which carries the same discipline), and
 * `@atta/ui` pulls in React/`@xyflow/react`. A caller in a surface that
 * already depends on both packages (e.g. a web app bridging this callback
 * into a `FlowEventSource`) can pass these values straight through — every
 * field here is a required version of an optional `FlowEvent` field, so the
 * assignment always typechecks with no mapping step. Keep the two shapes in
 * lockstep by hand; nothing enforces it automatically.
 */
export type AgentLifecycleEvent =
  | { type: 'node:start'; nodeId: string; runId: string }
  | { type: 'node:streaming'; nodeId: string; runId: string; content: string }
  | { type: 'node:complete'; nodeId: string; runId: string }
  | { type: 'node:failed'; nodeId: string; runId: string; error: string }

/** Role → binary configuration, keyed by the Plan's `agentRole` strings. */
export interface AgentSpawnExecutorConfig {
  roleBinaries: Record<string, RoleBinaryConfig>
  /**
   * Called for every node-lifecycle transition, in the order it occurs —
   * one path (`createAgentLifecycleNodeExecutor`'s returned executor) is the
   * only place this is ever invoked, so ordering is a property of that
   * function's control flow, never of which node kind happened to run when.
   * Optional: a caller with no observer (a batch run, a test) supplies
   * nothing and pays no cost.
   *
   * **What arrives here is redacted.** Every event passes through one
   * redaction pass at that single emission point (`graph-builder.ts`'s
   * `safeEmit`) before reaching this callback, whichever path produced it.
   * Structure survives it intact — `type`, `nodeId` and `runId` are always
   * the real values — while free text a spawned process authored has its
   * machine paths, session and account identifiers and rate-limit metadata
   * replaced by named placeholders, and is cut to a bounded excerpt. So
   * `content` and `error` are excerpts for an observer to read, never a
   * faithful copy of what the child printed. A caller that needs the verbatim
   * stream reads it from the capture — `executeAgentSpawnNode`'s own return
   * value, or the stream reader's `onParsedEvents` hook — and owns the exposure
   * that carries. Not from the recorded result: what the graph records and a
   * checkpointer persists is narrowed too, by its own pass over the same
   * redaction rules.
   */
  onEvent?: (event: AgentLifecycleEvent) => void
  /**
   * Absolute path every agent-spawn node's `workingDirectory` must resolve
   * inside (after symlinks are followed) — the confinement root for every
   * spawned process's cwd. Required: without it, a node's declared
   * `workingDirectory` would be trusted with no bound at all.
   */
  workingDirectoryRoot: string
  /**
   * Env var names copied from this process's own environment into every
   * spawned process, in addition to each role's own `env`. Defaults to
   * `PATH` + `HOME` — enough for a CLI to resolve binaries and find its own
   * login/config state, never the full parent environment (which may carry
   * vendor API keys, database URLs, or other secrets this package has no
   * business handing to an externally-authenticated process).
   */
  envAllowlist?: string[]
  /**
   * Action name → command configuration, keyed by the Plan's `action`
   * strings. Optional: a Plan with no mechanical steps needs none. An action
   * a mechanical node names but this map does not declare is refused, never
   * guessed — see `executeMechanicalNode`.
   */
  mechanicalActions?: Record<string, MechanicalActionConfig>
  /**
   * Predicate → decision configuration, keyed by the id of the step that
   * *declares* the `decision` (`PlanAgentSpawnNode.decision`/
   * `PlanMechanicalNode.decision`'s owning node), never by `decision.examine`
   * or either of its targets — the same keyed-by-Plan-carried-name
   * resolution `roleBinaries`/`mechanicalActions` already use. Each function
   * receives the examined step's own recorded result
   * (`state.results[decision.examine]`) and returns whether the positive
   * (`ifTrue`) outcome applies. That recorded result is the *narrowed* one — a
   * predicate keying on captured output keys on a redacted, bounded form of it,
   * which is what the run itself will read again after a resume. A predicate
   * that needs the verbatim output cannot get it from graph state at all and
   * must not be written as though it could. Optional: a Plan with no `decision`-bearing
   * nodes needs none. A node that declares a `decision` but has no entry
   * here — or whose predicate throws — is refused the same way an
   * unconfigured `roleBinaries`/`mechanicalActions` key is: a clear, named
   * error, never a silent default to `ifFalse` or `ifTrue`. The predicate
   * itself is caller code; this package never evaluates a condition inline.
   */
  decisionPredicates?: Record<string, (result: StepNodeResult) => boolean>
}

/**
 * What a result's persisted form replaced, so a consumer can tell a value that
 * was narrowed from one the node never produced.
 *
 * Present on every result the graph records, absent on one an executor returned
 * directly — which is exactly the distinction it exists to carry. A node
 * executor (`executeAgentSpawnNode`, `executeMechanicalNode`) returns the
 * verbatim capture and no `narrowing`; the graph's node wrapper narrows that
 * value before writing it into state, and the narrowed copy says so. So
 * `narrowing === undefined` means "this is the capture itself", never "nothing
 * was removed from a state read".
 *
 * Reported rather than left implicit because the alternative — a shorter string
 * and a smaller array with nothing saying why — is indistinguishable from a
 * node that simply printed less, and a consumer diagnosing a run would have no
 * way to tell a quiet command from a redacted one.
 */
export interface ResultNarrowing {
  /**
   * Every field on this result whose value is a bounded, redacted form of what
   * the node produced — never the original. A field absent from this list is
   * verbatim.
   */
  redactedFields: string[]
  /**
   * Characters the node's own value held, keyed by field name, before
   * redaction and bounding. For `events` this is the total across every record
   * the stream held, the dropped ones included.
   */
  originalLengths: Record<string, number>
  /**
   * Records the node's own event stream held. Compare against the persisted
   * `events` array's own length to see how many the bound dropped. `0` on a
   * mechanical result, which has no stream at all.
   */
  originalEventCount: number
}

/**
 * The structured result of executing one agent-spawn node. `events` is the
 * spawned process's own structured (NDJSON) output stream, parsed and kept
 * verbatim — this package never scrapes prose with a regex to derive it.
 *
 * "Verbatim" is true of what `executeAgentSpawnNode` returns and of what the
 * event channel's caller can still reach through `onParsedEvents`. It is not
 * true of the copy the graph records in `results` and a checkpointer persists:
 * that one is narrowed, and carries `narrowing` saying so. See
 * `narrowPersistedResult` in `reason-text.ts`.
 */
export interface AgentSpawnNodeResult {
  nodeId: string
  /** Discriminant — which node kind produced this result. */
  kind: 'agent-spawn'
  /**
   * Every structured event the process emitted on stdout, in order.
   *
   * `unknown[]` because the records are whatever the spawned CLI printed: the
   * capture holds parsed JSON values, while the persisted form holds one
   * bounded, redacted string per record. A consumer reading this off graph
   * state or off a checkpoint gets the second shape.
   */
  events: unknown[]
  /**
   * Resumable session id, extracted from the event stream when present.
   *
   * Verbatim on the capture; redacted on the persisted copy, because a session
   * identifier is one of the values the redaction rules exist to remove and
   * this is not the field a resume reads. The load-bearing copy is the
   * `sessions` channel (`RunCheckpointState.sessions`), which a later step's
   * `resume` looks up and which is deliberately never narrowed.
   */
  sessionId?: string
  exitCode: number
  durationMs: number
  /** What the persisted form replaced. Absent on the executor's own capture. */
  narrowing?: ResultNarrowing
}

// ── Mechanical steps ────────────────────────────────────────────────────────
//
// A mechanical node performs an external action and has no model turn at all:
// no prompt, no template, no session, no spawned agent. Its Plan node carries
// exactly one field of substance — `action`, an action *name* (`git-apply`),
// not a command line. `@atta/engine`'s own spec is explicit that this is "an
// action name, not yet a real shell/function binding", and that the binding
// layer must decide, up front, whether a flow may name a command its author
// never declared. This package answers that: it may not. The name is a key
// into `mechanicalActions`, an unknown key is refused, and the resolved
// command is spawned with an argv array and no shell.

/**
 * How a single mechanical action name resolves to a spawnable process.
 * Supplied by the caller at executor-construction time — never read from the
 * Plan. `args` is a fixed argv array, never a shell string and never
 * interpolated with Plan or graph state: a mechanical node's own declaration
 * contributes the action name and nothing else to what runs.
 */
export interface MechanicalActionConfig {
  /** Executable to spawn, e.g. "git", "gh". */
  command: string
  /** Full argv (excluding the command itself). Fixed by the caller; defaults to none. */
  args?: string[]
  /** Extra environment variables merged into the spawned process's environment, after the executor's own env allowlist (see `AgentSpawnExecutorConfig.envAllowlist`). */
  env?: Record<string, string>
  /**
   * Kills the process and rejects if it hasn't closed within this many
   * milliseconds. Defaults to `10` minutes when omitted, matching the
   * agent-spawn default — a hung process is always eventually killed.
   */
  timeoutMs?: number
  /**
   * Exit codes this action declares as success. Defaults to `[0]`. This is
   * the *only* place a non-zero exit becomes acceptable: whether `1` means
   * "failed" or "no changes to apply" is the action's own business, and the
   * caller who declared the action is the one who knows. Without an entry
   * here, a non-zero exit throws — the executor never silently reports a run
   * as successful when the command it ran did not succeed.
   */
  successExitCodes?: number[]
}

/**
 * The structured result of executing one mechanical node. Unlike an
 * agent-spawn result there are no `events` and no `sessionId`: a mechanical
 * command emits ordinary output, not a structured agent event stream, so its
 * stdout and stderr are kept verbatim as text rather than parsed.
 *
 * "Verbatim" is true of what `executeMechanicalNode` returns. It is not true of
 * the copy the graph records in `results` and a checkpointer persists: that one
 * is narrowed, and carries `narrowing` saying so. See `narrowPersistedResult`
 * in `reason-text.ts`.
 */
export interface MechanicalNodeResult {
  nodeId: string
  /** Discriminant — which node kind produced this result. */
  kind: 'mechanical'
  /**
   * The Plan node's declared action name, verbatim — on the capture and on the
   * persisted copy alike. It is the caller's own declaration, not text a child
   * printed, and it is what identifies the action after the fact once
   * `command` has been through redaction.
   */
  action: string
  /**
   * The command the action name resolved to, for after-the-fact attribution.
   * Redacted on the persisted copy: the caller may resolve an action to an
   * absolute path, which is the machine's own filesystem layout and must not go
   * to rest. A bare command name (`git`) matches no rule and survives intact.
   */
  command: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  /** What the persisted form replaced. Absent on the executor's own capture. */
  narrowing?: ResultNarrowing
}

/**
 * Any node's result, as recorded in graph state. Discriminated on `kind` so
 * a consumer reading `state.results[someNodeId]` narrows without guessing
 * from field presence.
 */
export type StepNodeResult = AgentSpawnNodeResult | MechanicalNodeResult

// ── Run identity and durable checkpoint state (engine-halt-resume-v1 task 1) ─
//
// Appended at the end of this file rather than folded into the interfaces
// above, deliberately: a sibling task in this tranche appends here too, and
// two appends at the tail merge cleanly where two in-place edits to an
// existing exported interface would not.

/**
 * A run's whole identity: the id every event this run emits is correlated by,
 * and the id every checkpoint this run writes is keyed by. One value, so the
 * two can never be supplied independently and drift apart — which is the
 * failure this type exists to make impossible, since a run whose events say
 * one thing and whose checkpoints say another cannot be reassembled
 * afterwards from either half.
 *
 * `threadId` is not independent data: it is `threadIdForRun(runId)`, a pure
 * function of `runId`. That is what makes the identity survive a process
 * restart without a second store — a caller that persisted only the `runId`
 * (in its own records, in an Issue, in an argv) rebuilds the complete identity
 * with `runIdentityForRunId`, and the checkpointer it hands that identity to
 * resolves the same thread it wrote before the restart. Nothing else has to be
 * remembered, and nothing else can be remembered wrongly.
 */
export interface RunIdentity {
  /** Correlates every `AgentLifecycleEvent` this run emits; also `AgentSpawnGraphStateValue.runId`. */
  runId: string
  /** LangGraph's `configurable.thread_id` for this run — always `threadIdForRun(runId)`. */
  threadId: string
}

/**
 * A suspended (or completed) run's state, as read back out of the
 * checkpointer that wrote it — never out of a second store this package
 * maintains, because there is none.
 *
 * Carries the run's identity, the checkpoint's own compact identifiers, and
 * the three keyed channels the graph actually accumulates.
 *
 * `results` is returned exactly as the graph recorded it — which is now the
 * narrowed form, not the capture. Every entry's free text has been through
 * `redactSensitiveText` and bounded, and every entry carries a `narrowing`
 * saying which fields that applied to, so this read never hands back an
 * unredacted agent transcript or an unbounded command output. `sessions` and
 * `revisionCounts` are verbatim and deliberately so: the first is the id a
 * later step's `resume` passes to the agent CLI, the second the counter a
 * decision's ceiling is compared against, and narrowing either would change
 * what the run does rather than what it stores.
 */
export interface RunCheckpointState {
  identity: RunIdentity
  /** The checkpoint's own id — LangGraph's, not this package's. */
  checkpointId: string
  /** The checkpoint's ISO timestamp, verbatim from LangGraph. */
  checkpointedAt: string
  results: Record<string, StepNodeResult>
  sessions: Record<string, string>
  revisionCounts: Record<string, number>
}

// ── Run control and typed run outcomes ──────────────────────────────────────
//
// Appended at the end of this file for the same reason the identity types above
// were: more than one piece of work in flight adds types here, and two appends
// at the tail merge cleanly where two in-place edits to an existing exported
// interface would not.

/**
 * A caller's handle on a run that is already executing — the halt half of the
 * start/halt/resume surface. Built by `createRunControl` in `run-halt.ts`,
 * which is also where the reasoning behind the `AbortSignal` shape and the
 * node-boundary semantics lives.
 *
 * Declared here rather than beside its factory so the graph builder can accept
 * one as a parameter type without importing the factory's module, and so every
 * type this package's public surface names stays findable in one file.
 */
export interface RunControl {
  /**
   * Cancellation signal for this run, in the shape a bounded agent runner's
   * own cancellation input already takes. Aborted by `halt()`; also passable to
   * any other abortable work the caller wants stopped alongside the run.
   */
  readonly signal: AbortSignal
  /** Whether `halt()` (or a linked upstream signal) has fired. */
  readonly halted: boolean
  /** The reason the first `halt()` carried, when it carried one. */
  readonly haltReason: string | undefined
  /**
   * Stops the run at its next node boundary. Idempotent, and first call wins:
   * the recorded reason is the one that actually stopped the run.
   */
  halt(reason?: string): void
}

/**
 * Why a run is not executing, in the vocabulary the normative sources use —
 * never collapsed into a boolean success flag.
 *
 * `paused` and `resumed` are the two halves of a run that stopped and was
 * continued; `completed`, `failed` and `exhausted` are the three ways a leg
 * stops. `exhausted` is deliberately its own reason rather than a flavour of
 * `completed`: a bounded runner that reaches its ceiling raises an explicit
 * typed non-success (`MaxTurnsExceededError` once `maxTurns` is reached, in the
 * OpenAI Agents SDK's own run loop), and a run that stopped because it ran out
 * of revisions has not answered the question it was given. Reporting it as
 * success is the single misreading this vocabulary exists to prevent.
 */
export type RunOutcomeReason = 'paused' | 'resumed' | 'completed' | 'failed' | 'exhausted'

/** Shared by every leg outcome: whose run it was, and whether this leg was a continuation. */
export interface RunOutcomeBase {
  identity: RunIdentity
  /**
   * The checkpoint id this leg continued from — present only when the leg was
   * started by `resumeControlledRun`, absent on a run's first leg. This is what
   * makes `resumed` observable on an outcome without inventing a sixth terminal
   * reason for it: a resume is a property of the leg, not of how it ended.
   */
  resumedFrom?: string
}

/**
 * The run reached a terminal node of its own graph with every step it routed
 * through recorded. The checkpoint is the run's state as its own store holds
 * it — read through the checkpointer that wrote it, never from a second record
 * this package keeps, because it keeps none.
 */
export interface RunCompletedOutcome extends RunOutcomeBase {
  reason: 'completed'
  checkpoint: RunCheckpointState
}

/**
 * The run stopped at a node boundary because it was halted, and has a pending
 * continuation. `pendingNodes` is where a resume starts — the nodes LangGraph
 * still owes this thread, none of which has executed.
 */
export interface RunPausedOutcome extends RunOutcomeBase {
  reason: 'paused'
  /**
   * Nodes the run is pending at. A resume executes exactly these first.
   *
   * Optional, and absent rather than empty when the pending set could not be
   * read — that read goes through the same store the run stopped on, and a
   * failure there must not replace the halt being reported with an unrelated
   * error. An empty array would be an affirmative claim that nothing is pending,
   * which is the opposite of what a paused run means; absence says "not known"
   * and makes a caller handle it.
   */
  pendingNodes?: string[]
  /** The reason the halt carried, when the caller gave one. */
  haltReason?: string
  /**
   * The run's persisted state. Optional here, unlike on a completed outcome,
   * because a halt fired before the first superstep committed leaves a thread
   * with a pending node and nothing recorded yet — an honest `undefined`, not a
   * failure to read.
   */
  checkpoint?: RunCheckpointState
}

/**
 * A node threw for a reason that was not a halt, so the run stopped without
 * reaching a terminal node. `error` is the thrown message verbatim — the node
 * executors' own text, which is what a caller matches on.
 */
export interface RunFailedOutcome extends RunOutcomeBase {
  reason: 'failed'
  error: string
  /**
   * Nodes still pending on the thread, including the one that threw. Absent
   * rather than empty when the pending set could not be read — see
   * `RunPausedOutcome.pendingNodes` for why absence and empty must differ.
   */
  pendingNodes?: string[]
  /**
   * The run's persisted state, when it could be read. Absent when nothing was
   * checkpointed yet, and also when the read itself failed — a checkpoint read
   * that throws must never replace the failure being reported with its own.
   */
  checkpoint?: RunCheckpointState
}

/**
 * Which decision ceiling stopped a run, recorded at the moment routing refused
 * to loop again — the only moment it is known without guessing.
 *
 * Recorded rather than derived afterwards because the derivation is not sound:
 * a target's revision count can exceed some *other* decision's ceiling long
 * after that decision last evaluated, so reading the ceilings back off the final
 * state would report exhaustion for a run that ended for an unrelated reason.
 */
export interface RunExhaustion {
  /** The decision-bearing node whose ceiling was reached. */
  nodeId: string
  /** The route target the predicate resolved to, and which was refused. */
  target: string
  /** The ceiling, verbatim from that node's declared `decision.maxRevisions`. */
  maxRevisions: number
  /** The target's recorded execution count when routing refused to loop again. */
  revisions: number
}

/**
 * A run's outcome as its own checkpointer holds it — the persisted half of the
 * vocabulary, readable in a fresh process with nothing but the `runId`.
 *
 * Kept in the run's own checkpointed state rather than in a table beside it, for
 * the reason the identity contract already gives: a second store can disagree
 * with the checkpoint, and then something has to decide which one is true. An
 * outcome record written next to the state it describes cannot drift from it.
 *
 * `resumed` is a real record and not a terminal one: the first node a resumed
 * leg runs records it, so a run mid-flight under a continuation reads as
 * `resumed` for exactly as long as that is the true thing to say about it. The
 * leg's own terminal record then replaces it.
 *
 * `paused` and `failed` are not written by this package at all — they are read
 * back off the failed task LangGraph itself persists for the thread, which is
 * why they carry the thrown message verbatim rather than a reconstruction of it.
 * `readRunOutcome` is where the two sources are composed into one answer.
 */
export type RunOutcomeRecord =
  /** Halted at a node boundary, with a pending continuation. `detail` is the halt's own message, verbatim. */
  | { reason: 'paused'; at: string; detail: string }
  /** A node threw for a reason that was not a halt. `error` is that message, verbatim. */
  | { reason: 'failed'; at: string; error: string }
  /** Continued from `fromCheckpointId`, and still running as far as the store knows. */
  | { reason: 'resumed'; at: string; fromCheckpointId: string }
  /** Reached a terminal node of its own graph with no ceiling refused. */
  | { reason: 'completed'; at: string }
  /** Terminated because a decision's revision ceiling refused to loop again. */
  | { reason: 'exhausted'; at: string; exhaustion: RunExhaustion }

/**
 * The run stopped because a decision's revision ceiling refused to loop again.
 *
 * Its own reason, never folded into `completed`. A bounded runner that reaches
 * its ceiling raises an explicit typed non-success rather than returning a final
 * output, and the same holds here: the run's graph terminated, but the question
 * the Plan was given has not been answered — the loop simply ran out of
 * permitted revisions. A caller that wants to treat that as acceptable says so
 * by naming this reason; nothing lets it happen by omission.
 */
export interface RunExhaustedOutcome extends RunOutcomeBase {
  reason: 'exhausted'
  checkpoint: RunCheckpointState
  exhaustion: RunExhaustion
}

/**
 * How a leg of a run ended, as a value rather than as a thrown/not-thrown
 * distinction. Discriminated on `reason` so a caller cannot read an exhausted
 * or failed run as a completed one without saying so: there is no field common
 * to all four that means "it worked".
 */
export type RunOutcome = RunCompletedOutcome | RunPausedOutcome | RunFailedOutcome | RunExhaustedOutcome
