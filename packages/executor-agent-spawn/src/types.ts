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
  /** Extra environment variables merged into the spawned process's environment. */
  env?: Record<string, string>
  /**
   * Kills the process and rejects if it hasn't closed within this many
   * milliseconds. Omit to wait indefinitely — the CLI's own `maxTurns`
   * enforcement is the only bound in that case.
   */
  timeoutMs?: number
}

/** Role → binary configuration, keyed by the Plan's `agentRole` strings. */
export interface AgentSpawnExecutorConfig {
  roleBinaries: Record<string, RoleBinaryConfig>
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
