/**
 * @file types.ts
 * @description Public types for the agent-spawn executor: role-to-binary
 * configuration and the structured result each executed node produces.
 *
 * A Plan's agent-spawn node names a role (`PlanAgentSpawnNode.agentRole`),
 * never a binary — the caller resolves role → binary via `roleBinaries`
 * below, because the binary present on one machine may be absent on another.
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

/** Role → binary configuration, keyed by the Plan's `agentRole` strings. */
export interface AgentSpawnExecutorConfig {
  roleBinaries: Record<string, RoleBinaryConfig>
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
}

/**
 * The structured result of executing one agent-spawn node. `events` is the
 * spawned process's own structured (NDJSON) output stream, parsed and kept
 * verbatim — this package never scrapes prose with a regex to derive it.
 */
export interface AgentSpawnNodeResult {
  nodeId: string
  /** Every structured event the process emitted on stdout, in order. */
  events: unknown[]
  /** Resumable session id, extracted from the event stream when present. */
  sessionId?: string
  exitCode: number
  durationMs: number
}
