/**
 * @file process-lifecycle.ts
 * @description Spawns an agent-spawn node's external process and owns its
 * lifecycle: the timeout that kills a process which never exits, and the
 * close/error race that resolves or rejects the wait. Split out of
 * `node-executor.ts` so this concern — getting one process started and
 * eventually settled — has no knowledge of what that process's stdout
 * means (`stream-reader.ts`).
 */

import { spawn } from 'node:child_process'

/**
 * The subset of Node's `ChildProcess` this package depends on. Narrowed to
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

export const defaultSpawn: SpawnFn = (command, args, options) =>
  spawn(command, args, options) as unknown as SpawnedProcessLike

/** No `timeoutMs` means the caller never bounds a step's own runtime; the executor still must — a process that never exits must not hang the run forever. Shared with the mechanical executor so both node kinds are bounded identically. */
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

export interface ProcessLifecycleParams {
  spawnFn: SpawnFn
  command: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  timeoutMs: number
  nodeId: string
  agentRole: string
  /**
   * Accepted and stored on the returned handle; nothing in this package
   * ever reads it yet. A future task makes cancellation real (aborting the
   * spawned process when this signal fires) by editing only this file.
   */
  signal?: AbortSignal
}

export interface ProcessLifecycleHandle {
  child: SpawnedProcessLike
  /** Inert — see `ProcessLifecycleParams.signal`. */
  signal?: AbortSignal
  /**
   * Waits on the process's `close` event, not `exit` — `exit` can fire
   * before stdio streams finish flushing, which would silently truncate a
   * captured stream. A process that never exits is killed and the promise
   * rejects instead of hanging forever.
   */
  waitForExit(): Promise<number>
}

/**
 * Spawns one agent-spawn node's process and returns a handle exposing it
 * (so the caller can attach stream listeners and write to stdin before the
 * process is awaited) plus the promise that settles on its exit.
 */
export function spawnProcessLifecycle(params: ProcessLifecycleParams): ProcessLifecycleHandle {
  const { spawnFn, command, args, cwd, env, timeoutMs, nodeId, agentRole, signal } = params
  const child = spawnFn(command, args, { cwd, env })

  return {
    child,
    signal,
    waitForExit: () =>
      new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill('SIGTERM')
          reject(
            new Error(
              `Agent-spawn node '${nodeId}' (role '${agentRole}') exceeded its ${timeoutMs}ms timeout and was killed.`
            )
          )
        }, timeoutMs)
        child.on('error', (err) => {
          clearTimeout(timer)
          reject(new Error(`Failed to spawn '${command}' for role '${agentRole}' (node '${nodeId}'): ${err.message}`))
        })
        child.on('close', (code) => {
          clearTimeout(timer)
          resolve(code ?? 0)
        })
      })
  }
}
