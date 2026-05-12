import type { ActiveTask, CetanaEvent } from '@atta/cetana-coordinator'
import type { TaskStatus } from '../types.js'

/**
 * Check whether a process with the given PID is still alive.
 * Uses kill(pid, 0) — sends no signal, just checks existence.
 * Returns false if the process doesn't exist (ESRCH) or we lack permissions (EPERM means it exists).
 */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    // EPERM = process exists but we can't signal it (still alive)
    if (code === 'EPERM') return true
    // ESRCH = process does not exist
    return false
  }
}

/**
 * Derive the displayed status for a task.
 * CRASHED = has a PID, PID is dead, and no terminal event in log.
 */
export function taskStatus(task: ActiveTask, events?: CetanaEvent[]): TaskStatus {
  // Terminal states from JSONL log
  if (events) {
    for (const evt of events) {
      if (evt.type === 'task.completed') return 'completed'
      if (evt.type === 'task.failed') return 'failed'
    }
  } else {
    // Fall back to in-memory status
    if (task.status === 'completed') return 'completed'
    if (task.status === 'failed') return 'failed'
  }

  // Check liveness
  if (task.pid !== undefined && !isAlive(task.pid)) {
    // PID is dead but no terminal event — process crashed unexpectedly
    return 'CRASHED'
  }

  if (task.status === 'blocked') return 'blocked'
  return 'ongoing'
}
