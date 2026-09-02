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
   * (`ifTrue`) outcome applies. Optional: a Plan with no `decision`-bearing
   * nodes needs none. A node that declares a `decision` but has no entry
   * here — or whose predicate throws — is refused the same way an
   * unconfigured `roleBinaries`/`mechanicalActions` key is: a clear, named
   * error, never a silent default to `ifFalse` or `ifTrue`. The predicate
   * itself is caller code; this package never evaluates a condition inline.
   */
  decisionPredicates?: Record<string, (result: StepNodeResult) => boolean>
}

/**
 * The structured result of executing one agent-spawn node. `events` is the
 * spawned process's own structured (NDJSON) output stream, parsed and kept
 * verbatim — this package never scrapes prose with a regex to derive it.
 */
export interface AgentSpawnNodeResult {
  nodeId: string
  /** Discriminant — which node kind produced this result. */
  kind: 'agent-spawn'
  /** Every structured event the process emitted on stdout, in order. */
  events: unknown[]
  /** Resumable session id, extracted from the event stream when present. */
  sessionId?: string
  exitCode: number
  durationMs: number
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
 */
export interface MechanicalNodeResult {
  nodeId: string
  /** Discriminant — which node kind produced this result. */
  kind: 'mechanical'
  /** The Plan node's declared action name, verbatim. */
  action: string
  /** The command the action name resolved to, for after-the-fact attribution. */
  command: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
}

/**
 * Any node's result, as recorded in graph state. Discriminated on `kind` so
 * a consumer reading `state.results[someNodeId]` narrows without guessing
 * from field presence.
 */
export type StepNodeResult = AgentSpawnNodeResult | MechanicalNodeResult
