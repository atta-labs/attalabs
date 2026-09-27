/**
 * @file node-executor.ts
 * @description Composes the process lifecycle (`process-lifecycle.ts`) and
 * the stream reader (`stream-reader.ts`) into one agent-spawn node
 * execution: resolves the node's role/permission/working-directory,
 * spawns the process, writes its rendered prompt to stdin, waits for the
 * process to fully close, and returns a structured result. No vendor SDK,
 * no `*_API_KEY` anywhere here — the spawned process authenticates via its
 * own already-logged-in subscription session.
 */

import { realpathSync } from 'node:fs'
import { isAbsolute, sep } from 'node:path'
import type { PlanAgentSpawnNode } from '@atta/engine'
import {
  defaultSpawn,
  DEFAULT_TIMEOUT_MS,
  spawnProcessLifecycle,
  type SpawnedProcessLike,
  type SpawnFn
} from './process-lifecycle'
import { attachStreamReader, finalizeEvents } from './stream-reader'
import type { AgentSpawnExecutorConfig, AgentSpawnNodeResult } from './types'

export { defaultSpawn, DEFAULT_TIMEOUT_MS }
export type { SpawnedProcessLike, SpawnFn }

/** The minimum a spawned process needs to resolve its own binaries and find its already-logged-in session state — not the parent process's full (possibly secret-bearing) environment. Shared with the mechanical executor. */
export const DEFAULT_ENV_ALLOWLIST = ['PATH', 'HOME']

/**
 * Resolves and confines a node's declared `workingDirectory`: it must be an
 * absolute path, must exist, and — after resolving symlinks — must sit
 * inside `allowedRoot`. Returns the resolved real path, which is what's
 * actually passed to `spawn` as `cwd`, so a `workingDirectory` that is
 * itself a symlink pointing outside the root is caught rather than
 * silently followed at spawn time.
 */
function resolveConfinedWorkingDirectory(node: PlanAgentSpawnNode, allowedRoot: string): string {
  if (!node.workingDirectory || !isAbsolute(node.workingDirectory)) {
    throw new Error(
      `Agent-spawn node '${node.id}' has a non-absolute or empty workingDirectory ('${node.workingDirectory}') — refusing to spawn with an unbounded cwd. Declare an absolute path.`
    )
  }

  let real: string
  try {
    real = realpathSync(node.workingDirectory)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Agent-spawn node '${node.id}' declares workingDirectory '${node.workingDirectory}', which could not be resolved: ${message}`
    )
  }

  const realRoot = realpathSync(allowedRoot)
  if (real !== realRoot && !real.startsWith(realRoot + sep)) {
    throw new Error(
      `Agent-spawn node '${node.id}''s workingDirectory ('${node.workingDirectory}', resolved to '${real}') escapes the configured root '${allowedRoot}' — refusing to spawn outside it.`
    )
  }

  return real
}

/**
 * Builds a spawned process's environment: the caller's own `env` for this
 * role/action overlaid on top of an explicit allowlist pulled from this process's own
 * environment (default `PATH` + `HOME`) — never the full parent
 * environment, which may carry secrets (vendor API keys, DB URLs) this
 * package has no business handing to an externally-authenticated process.
 */
export function buildChildEnv(
  spawnConfig: { env?: Record<string, string> },
  envAllowlist: string[] = DEFAULT_ENV_ALLOWLIST
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of envAllowlist) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  return { ...env, ...spawnConfig.env }
}

/** Scans events in reverse for the last one carrying a string session id. */
function extractSessionId(events: unknown[]): string | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event && typeof event === 'object') {
      const record = event as Record<string, unknown>
      const candidate = record.session_id ?? record.sessionId
      if (typeof candidate === 'string') return candidate
    }
  }
  return undefined
}

export interface ExecuteAgentSpawnNodeParams {
  node: PlanAgentSpawnNode
  /** The already-rendered prompt to write to the process's stdin. */
  prompt: string
  /** Prior session id to resume, when the node declares `resume`. */
  resumeSessionId?: string
  config: AgentSpawnExecutorConfig
  /** Injectable for tests; defaults to `node:child_process`'s `spawn`. */
  spawnFn?: SpawnFn
  /**
   * Called once, with every event this node's process reported, right
   * after its stdout is fully parsed — matching today's behavior exactly.
   * Inert seam: a future task makes event observation live by editing only
   * `stream-reader.ts`, never this composer.
   */
  onEvent?: (events: unknown[]) => void
  /**
   * Accepted and forwarded to the process lifecycle handle; nothing in
   * this package acts on it yet. Inert seam: a future task makes
   * cancellation real by editing only `process-lifecycle.ts`, never this
   * composer.
   */
  signal?: AbortSignal
}

/**
 * Executes one agent-spawn node: spawns its role's configured binary,
 * writes the rendered prompt to stdin, waits for the process to fully
 * close, and captures its structured output stream into the result.
 */
export async function executeAgentSpawnNode(params: ExecuteAgentSpawnNodeParams): Promise<AgentSpawnNodeResult> {
  const { node, prompt, resumeSessionId, config, spawnFn = defaultSpawn, onEvent, signal } = params

  // Own-property lookup, for the same reason the mechanical path uses one:
  // `agentRole` arrives from the Plan, and an inherited key resolves to a
  // truthy object with no `command`.
  const binaryConfig = Object.hasOwn(config.roleBinaries, node.agentRole)
    ? config.roleBinaries[node.agentRole]
    : undefined
  if (!binaryConfig) {
    throw new Error(
      `No binary configured for role '${node.agentRole}' (node '${node.id}'). Provide one in AgentSpawnExecutorConfig.roleBinaries.`
    )
  }
  if (!binaryConfig.allowedPermissions.includes(node.permission)) {
    throw new Error(
      `Agent-spawn node '${node.id}' declares permission '${node.permission}', which role '${node.agentRole}' does not allow. Allowed: ${
        binaryConfig.allowedPermissions.join(', ') || '(none configured)'
      }.`
    )
  }

  const cwd = resolveConfinedWorkingDirectory(node, config.workingDirectoryRoot)

  const args = binaryConfig.buildArgs({
    permission: node.permission,
    maxTurns: node.maxTurns,
    resumeSessionId
  })

  const timeoutMs = binaryConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const startedAt = Date.now()

  const lifecycle = spawnProcessLifecycle({
    spawnFn,
    command: binaryConfig.command,
    args,
    cwd,
    env: buildChildEnv(binaryConfig, config.envAllowlist),
    timeoutMs,
    nodeId: node.id,
    agentRole: node.agentRole,
    signal
  })

  const reader = attachStreamReader(lifecycle.child)
  lifecycle.child.stdin?.write(prompt)
  lifecycle.child.stdin?.end()

  const exitCode = await lifecycle.waitForExit()

  const events = finalizeEvents(reader, node.id, onEvent)

  if (exitCode !== 0) {
    throw new Error(
      `Agent-spawn node '${node.id}' (role '${node.agentRole}') exited with code ${exitCode}. stderr: ${reader.stderrChunks.join('').slice(0, 2000) || '(empty)'}`
    )
  }

  return {
    nodeId: node.id,
    kind: 'agent-spawn',
    events,
    sessionId: extractSessionId(events),
    exitCode,
    durationMs: Date.now() - startedAt
  }
}
