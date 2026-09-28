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
 *
 * The process itself is owned by `process-lifecycle.ts`, the same state
 * machine the agent-spawn path uses, rather than by a second timeout/kill
 * loop of this file's own. A mechanical action is a real `git`/`gh`-shaped
 * command holding this run's working-directory and execution permissions, so
 * a halt has to reach it exactly as it reaches a spawned agent: leaving it
 * running until its own `timeoutMs` elapsed (ten minutes by default) would
 * keep it acting on the working directory after the caller believed the run
 * was cancelled. Sharing the lifecycle is also what gives this kind the
 * graceful-then-forced escalation and the first-settlement-wins
 * timeout-versus-cancellation race for free, instead of a second
 * implementation of both that can disagree with the first.
 */

import { realpathSync } from 'node:fs'
import type { PlanMechanicalNode } from '@atta/engine'
import { buildChildEnv, defaultSpawn, DEFAULT_TIMEOUT_MS, type SpawnFn } from './node-executor'
import { type ProcessSubject, spawnProcessLifecycle } from './process-lifecycle'
import type { AgentSpawnExecutorConfig, MechanicalNodeResult } from './types'

/** Exit codes an action is treated as succeeding on when it declares none. */
const DEFAULT_SUCCESS_EXIT_CODES = [0]

export interface ExecuteMechanicalNodeParams {
  node: PlanMechanicalNode
  config: AgentSpawnExecutorConfig
  /** Injectable for tests; defaults to `node:child_process`'s `spawn`. */
  spawnFn?: SpawnFn
  /**
   * Cancellation input for this node's command, forwarded to the process
   * lifecycle, which is where it acts: aborting it terminates the spawned
   * command — graceful signal first, forced signal on a bounded deadline —
   * and this call rejects with a `ProcessCancelledError`, the same typed
   * outcome an agent-spawn node's cancellation produces, so a halt reaching a
   * running mechanical node is reported as the halt it is rather than as a
   * failure. A signal already aborted when this runs spawns nothing at all.
   */
  signal?: AbortSignal
  /** How long the graceful signal is given before the forced one follows; injectable for the same reason `spawnFn` is. */
  gracefulTerminationMs?: number
}

/** How this node kind is named in a termination or spawn-failure message — it has no agent and no role to be named by. */
function mechanicalSubject(node: PlanMechanicalNode): ProcessSubject {
  return {
    description: `Mechanical node '${node.id}' (action '${node.action}')`,
    binding: `mechanical action '${node.action}'`
  }
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
 * is read; a process that never closes is killed at `timeoutMs`, and one the
 * caller no longer wants is killed the moment `signal` aborts — both through
 * the shared process lifecycle, which rejects with the typed
 * `ProcessTimedOutError` / `ProcessCancelledError` rather than a plain `Error`,
 * so a halted run reads as paused and not as broken.
 */
export async function executeMechanicalNode(params: ExecuteMechanicalNodeParams): Promise<MechanicalNodeResult> {
  const { node, config, spawnFn = defaultSpawn, signal, gracefulTerminationMs } = params

  // Own-property lookup, not a bare index: `action` arrives from the Plan, and
  // a bare `actions[name]` resolves inherited keys (`__proto__`, `constructor`)
  // to an object that is truthy but has no `command`, turning a clean refusal
  // into a confusing spawn-time failure.
  const actions = config.mechanicalActions
  const actionConfig = actions && Object.hasOwn(actions, node.action) ? actions[node.action] : undefined
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
  const lifecycle = spawnProcessLifecycle({
    spawnFn,
    command: actionConfig.command,
    args,
    cwd,
    env: buildChildEnv(actionConfig, config.envAllowlist),
    timeoutMs,
    nodeId: node.id,
    agentRole: node.role,
    subject: mechanicalSubject(node),
    signal,
    gracefulTerminationMs
  })
  const child = lifecycle.child

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()))
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()))
  // A mechanical action takes no prompt; close stdin so a command that reads
  // it sees EOF instead of hanging until the timeout kills it.
  child.stdin?.end()

  const exitCode = await lifecycle.waitForExit()

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
