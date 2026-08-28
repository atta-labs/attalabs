/**
 * @file node-executor.ts
 * @description Spawns the external process for one agent-spawn node, writes
 * its rendered prompt to stdin, captures its structured (NDJSON) stdout
 * stream, and returns a structured result. No vendor SDK, no `*_API_KEY`
 * anywhere here — the spawned process authenticates via its own
 * already-logged-in subscription session.
 */

import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { isAbsolute, sep } from 'node:path'
import type { PlanAgentSpawnNode } from '@atta/engine'
import type { AgentSpawnExecutorConfig, AgentSpawnNodeResult, RoleBinaryConfig } from './types'

/** No `timeoutMs` means the role never bounds its own runtime; the executor still must — a process that never exits must not hang the run forever. */
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

/** The minimum a spawned CLI needs to resolve its own binaries and find its already-logged-in session state — not the parent process's full (possibly secret-bearing) environment. */
const DEFAULT_ENV_ALLOWLIST = ['PATH', 'HOME']

/**
 * The subset of Node's `ChildProcess` this module depends on. Narrowed to
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

const defaultSpawn: SpawnFn = (command, args, options) => spawn(command, args, options) as unknown as SpawnedProcessLike

/**
 * Parses the process's stdout as newline-delimited JSON. Throws naming the
 * offending line rather than falling back to prose-scraping — a candidate
 * agent with no structured output mode is a reporting concern, not
 * something this function silently works around.
 */
function parseNdjson(raw: string, nodeId: string): unknown[] {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((line, index) => {
    try {
      return JSON.parse(line)
    } catch {
      throw new Error(
        `Agent-spawn node '${nodeId}' produced non-JSON output on line ${index + 1} of its structured stream: ${line.slice(0, 200)}`
      )
    }
  })
}

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
 * Builds the spawned process's environment: the role's own `env` overlaid
 * on top of an explicit allowlist pulled from this process's own
 * environment (default `PATH` + `HOME`) — never the full parent
 * environment, which may carry secrets (vendor API keys, DB URLs) this
 * package has no business handing to an externally-authenticated process.
 */
function buildChildEnv(
  binaryConfig: RoleBinaryConfig,
  envAllowlist: string[] = DEFAULT_ENV_ALLOWLIST
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of envAllowlist) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  return { ...env, ...binaryConfig.env }
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
}

/**
 * Executes one agent-spawn node: spawns its role's configured binary,
 * writes the rendered prompt to stdin, waits for the process to fully
 * close, and captures its structured output stream into the result.
 *
 * Waits on the `close` event, not `exit` — `exit` can fire before stdio
 * streams finish flushing, which would silently truncate the captured
 * stream. A process that never exits is killed and the promise rejects
 * instead of hanging forever — `timeoutMs` always applies (default `10`
 * minutes when the role's config doesn't override it).
 */
export async function executeAgentSpawnNode(params: ExecuteAgentSpawnNodeParams): Promise<AgentSpawnNodeResult> {
  const { node, prompt, resumeSessionId, config, spawnFn = defaultSpawn } = params

  const binaryConfig = config.roleBinaries[node.agentRole]
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
  const child = spawnFn(binaryConfig.command, args, {
    cwd,
    env: buildChildEnv(binaryConfig, config.envAllowlist)
  })

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()))
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()))
  child.stdin?.write(prompt)
  child.stdin?.end()

  const exitCode = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(
        new Error(
          `Agent-spawn node '${node.id}' (role '${node.agentRole}') exceeded its ${timeoutMs}ms timeout and was killed.`
        )
      )
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(
        new Error(
          `Failed to spawn '${binaryConfig.command}' for role '${node.agentRole}' (node '${node.id}'): ${err.message}`
        )
      )
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code ?? 0)
    })
  })

  const events = parseNdjson(stdoutChunks.join(''), node.id)

  if (exitCode !== 0) {
    throw new Error(
      `Agent-spawn node '${node.id}' (role '${node.agentRole}') exited with code ${exitCode}. stderr: ${stderrChunks.join('').slice(0, 2000) || '(empty)'}`
    )
  }

  return {
    nodeId: node.id,
    events,
    sessionId: extractSessionId(events),
    exitCode,
    durationMs: Date.now() - startedAt
  }
}
