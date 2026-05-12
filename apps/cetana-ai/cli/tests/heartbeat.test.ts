import { describe, expect, it } from 'bun:test'
import { isAlive, taskStatus } from '../src/lib/heartbeat.js'
import type { ActiveTask } from '@atta/cetana-coordinator'
import type { CetanaEvent } from '@atta/cetana-coordinator'

function makeTask(overrides: Partial<ActiveTask> = {}): ActiveTask {
  return {
    taskId: 'task-test',
    issueNumber: 1,
    status: 'running',
    worktree: '/tmp/wt-1',
    startedAt: new Date().toISOString(),
    ...overrides
  }
}

function makeEvent(type: CetanaEvent['type']): CetanaEvent {
  const base = { ts: new Date().toISOString(), type, data: { taskId: 'task-test' } }
  switch (type) {
    case 'task.dispatched':
      return {
        ...base,
        type: 'task.dispatched',
        data: { taskId: 'task-test', issueNumber: 1, brief: 'test', worktree: '/tmp' }
      }
    case 'task.spawned':
      return { ...base, type: 'task.spawned', data: { taskId: 'task-test', pid: 999 } }
    case 'task.completed':
      return { ...base, type: 'task.completed', data: { taskId: 'task-test', exitCode: 0 } }
    case 'task.failed':
      return { ...base, type: 'task.failed', data: { taskId: 'task-test', reason: 'error', exitCode: 1 } }
    case 'task.blocked':
      return { ...base, type: 'task.blocked', data: { taskId: 'task-test', question: 'q?', questionId: 'qid' } }
    case 'task.unblocked':
      return { ...base, type: 'task.unblocked', data: { taskId: 'task-test', questionId: 'qid', reply: 'r' } }
    case 'task.progress':
      return { ...base, type: 'task.progress', data: { taskId: 'task-test', message: 'progress' } }
  }
}

describe('isAlive', () => {
  it('returns true for the current process PID', () => {
    expect(isAlive(process.pid)).toBe(true)
  })

  it('returns false for a non-existent PID', () => {
    // PID 999999 is very unlikely to exist
    expect(isAlive(999999)).toBe(false)
  })
})

describe('taskStatus', () => {
  it('returns completed when task.completed event present', () => {
    const task = makeTask({ status: 'running', pid: process.pid })
    const events: CetanaEvent[] = [makeEvent('task.dispatched'), makeEvent('task.completed')]
    expect(taskStatus(task, events)).toBe('completed')
  })

  it('returns failed when task.failed event present', () => {
    const task = makeTask({ status: 'running', pid: process.pid })
    const events: CetanaEvent[] = [makeEvent('task.dispatched'), makeEvent('task.failed')]
    expect(taskStatus(task, events)).toBe('failed')
  })

  it('returns CRASHED when PID is dead and no terminal event', () => {
    const task = makeTask({ status: 'running', pid: 999999 })
    const events: CetanaEvent[] = [makeEvent('task.dispatched'), makeEvent('task.progress')]
    expect(taskStatus(task, events)).toBe('CRASHED')
  })

  it('returns ongoing when PID is alive and task is running', () => {
    const task = makeTask({ status: 'running', pid: process.pid })
    const events: CetanaEvent[] = [makeEvent('task.dispatched'), makeEvent('task.spawned')]
    expect(taskStatus(task, events)).toBe('ongoing')
  })

  it('returns blocked when task status is blocked and PID is alive', () => {
    const task = makeTask({ status: 'blocked', pid: process.pid })
    const events: CetanaEvent[] = [makeEvent('task.dispatched'), makeEvent('task.blocked')]
    expect(taskStatus(task, events)).toBe('blocked')
  })

  it('falls back to in-memory status when no events provided', () => {
    const task = makeTask({ status: 'completed' })
    expect(taskStatus(task)).toBe('completed')
  })

  it('falls back to in-memory failed when no events provided', () => {
    const task = makeTask({ status: 'failed' })
    expect(taskStatus(task)).toBe('failed')
  })

  it('detects CRASHED from in-memory status when PID dead and no terminal status', () => {
    const task = makeTask({ status: 'running', pid: 999999 })
    // No events provided — falls into heartbeat check
    expect(taskStatus(task)).toBe('CRASHED')
  })
})
