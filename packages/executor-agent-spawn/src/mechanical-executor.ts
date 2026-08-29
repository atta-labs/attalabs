/**
 * @file mechanical-executor.ts
 * @description Runs one mechanical node: a step that performs an external
 * action and has no model turn. Deliberately a sibling of `node-executor.ts`
 * rather than a mode of it — a mechanical node has no prompt, no template, no
 * session and no spawned agent, so it must not travel the agent-spawn path
 * (an "empty prompt" through that path still launches an agent CLI and can
 * still cost a model turn, which is exactly what this node kind is defined by
 * not having). Nothing here imports the template renderer or any vendor SDK.
 *
 * The Plan's `action` is a *name*, not a command line. It is looked up in the
 * caller-supplied `mechanicalActions` map, and the resolved command is spawned
 * with an argv array — never through a shell, and never with Plan or graph
 * state interpolated into it. An action name with no entry in that map is
 * refused rather than guessed at.
 */

import { realpathSync } from 'node:fs'
import type { PlanMechanicalNode } from '@atta/engine'
import { buildChildEnv, defaultSpawn, DEFAULT_TIMEOUT_MS, type SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig, MechanicalNodeResult } from './types'

/** Exit codes an action is treated as succeeding on when it declares none. */
const DEFAULT_SUCCESS_EXIT_CODES = [0]

export interface ExecuteMechanicalNodeParams {
  node: PlanMechanicalNode
  config: AgentSpawnExecutorConfig
  /** Injectable for tests; defaults to `node:child_process`'s `spawn`. */
  spawnFn?: SpawnFn
}

/**
 * Executes one mechanical node: resolves its action name to a configured
 * command, spawns it in the run's working-directory root, captures stdout and
 * stderr verbatim, and returns them alongside the exit code.
 *
 * Output is captured as text, not parsed: a mechanical command emits ordinary
 * output, and the NDJSON parsing an agent-spawn node does would reject it.
 *
 * A non-zero exit that the action did not declare in `successExitCodes`
 * throws, naming the code and the captured stderr. It is never returned as a
 * successful result — a run that reports success having done nothing is the
 * failure this node kind is most likely to produce silently.
 *
 * Waits on `close`, not `exit`, so stdio finishes flushing before the output
 * is read; a process that never closes is killed at `timeoutMs`.
 */
export async function executeMechanicalNode(params: ExecuteMechanicalNodeParams): Promise<MechanicalNodeResult> {
  const { node, config, spawnFn = defaultSpawn } = params

  const actionConfig = config.mechanicalActions?.[node.action]
  if (!actionConfig) {
    throw new Error(
      `No command configured for mechanical action '${node.action}' (node '${node.id}'). Provide one in AgentSpawnExecutorConfig.mechanicalActions — an action this executor was not told about is never guessed at or run through a shell.`
    )
  }

  // The Plan contributes no directory for this node kind, so the run's own
  // confinement root is the cwd. Resolved through realpath for the same
  // reason the agent-spawn path does it: the process should run where the
  // root actually is, not where a symlink points.
  let cwd: string
  try {
    cwd = realpathSync(config.workingDirectoryRoot)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Mechanical node '${node.id}' cannot run: the configured workingDirectoryRoot '${config.workingDirectoryRoot}' could not be resolved: ${message}`
    )
  }

  const args = actionConfig.args ?? []
  const timeoutMs = actionConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const startedAt = Date.now()
  const child = spawnFn(actionConfig.command, args, {
    cwd,
    env: buildChildEnv(actionConfig, config.envAllowlist)
  })

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()))
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()))
  // A mechanical action takes no prompt; close stdin so a command that reads
  // it sees EOF instead of hanging until the timeout kills it.
  child.stdin?.end()

  const exitCode = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(
        new Error(
          `Mechanical node '${node.id}' (action '${node.action}') exceeded its ${timeoutMs}ms timeout and was killed.`
        )
      )
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(
        new Error(
          `Failed to spawn '${actionConfig.command}' for mechanical action '${node.action}' (node '${node.id}'): ${err.message}`
        )
      )
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code ?? 0)
    })
  })

  const stdout = stdoutChunks.join('')
  const stderr = stderrChunks.join('')

  const successExitCodes = actionConfig.successExitCodes ?? DEFAULT_SUCCESS_EXIT_CODES
  if (!successExitCodes.includes(exitCode)) {
    throw new Error(
      `Mechanical node '${node.id}' (action '${node.action}', command '${actionConfig.command}') exited with code ${exitCode}, which it does not declare as success (declared: ${successExitCodes.join(', ')}). stderr: ${stderr.slice(0, 2000) || '(empty)'}`
    )
  }

  return {
    nodeId: node.id,
    kind: 'mechanical',
    action: node.action,
    command: actionConfig.command,
    exitCode,
    stdout,
    stderr,
    durationMs: Date.now() - startedAt
  }
}
