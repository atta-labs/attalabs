import { describe, it, expect, afterEach } from 'bun:test'
import { unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { appendEvent, readEvents } from '../src/events.js'
import { taskLogPath } from '../src/paths.js'

const TEST_TASK_ID = `test-events-${Date.now()}`

afterEach(async () => {
  const logPath = taskLogPath(TEST_TASK_ID)
  if (existsSync(logPath)) {
    await unlink(logPath)
  }
})

describe('readEvents', () => {
  it('returns empty array when file does not exist', async () => {
    const nonExistentId = `test-no-file-${Date.now()}`
    const result = await readEvents(nonExistentId)
    expect(result).toEqual([])
  })

  it('parses multiple events in order', async () => {
    const ts1 = new Date().toISOString()
    const ts2 = new Date().toISOString()

    await appendEvent(TEST_TASK_ID, {
      ts: ts1,
      type: 'task.dispatched',
      data: { taskId: TEST_TASK_ID, issueNumber: 1, brief: 'do something', worktree: '/tmp/wt' }
    })
    await appendEvent(TEST_TASK_ID, {
      ts: ts2,
      type: 'task.progress',
      data: { taskId: TEST_TASK_ID, message: 'still going' }
    })

    const events = await readEvents(TEST_TASK_ID)
    expect(events).toHaveLength(2)
    expect(events[0]?.type).toBe('task.dispatched')
    expect(events[1]?.type).toBe('task.progress')
  })
})

describe('appendEvent', () => {
  it("creates the file and writes the event when it doesn't exist", async () => {
    const logPath = taskLogPath(TEST_TASK_ID)
    expect(existsSync(logPath)).toBe(false)

    await appendEvent(TEST_TASK_ID, {
      ts: new Date().toISOString(),
      type: 'task.progress',
      data: { taskId: TEST_TASK_ID, message: 'hello' }
    })

    expect(existsSync(logPath)).toBe(true)
  })

  it('appends without overwriting existing events', async () => {
    const ts = new Date().toISOString()
    await appendEvent(TEST_TASK_ID, {
      ts,
      type: 'task.progress',
      data: { taskId: TEST_TASK_ID, message: 'first' }
    })
    await appendEvent(TEST_TASK_ID, {
      ts,
      type: 'task.progress',
      data: { taskId: TEST_TASK_ID, message: 'second' }
    })

    const events = await readEvents(TEST_TASK_ID)
    expect(events).toHaveLength(2)
  })
})

describe('appendEvent / readEvents round-trip', () => {
  it('round-trips three different event types in order', async () => {
    const ts = new Date().toISOString()

    await appendEvent(TEST_TASK_ID, {
      ts,
      type: 'task.dispatched',
      data: { taskId: TEST_TASK_ID, issueNumber: 42, brief: 'fix the thing', worktree: '/tmp/wt-42' }
    })
    await appendEvent(TEST_TASK_ID, {
      ts,
      type: 'task.progress',
      data: { taskId: TEST_TASK_ID, message: 'working on it' }
    })
    await appendEvent(TEST_TASK_ID, {
      ts,
      type: 'task.completed',
      data: { taskId: TEST_TASK_ID, exitCode: 0 }
    })

    const events = await readEvents(TEST_TASK_ID)
    expect(events).toHaveLength(3)

    const [first, second, third] = events
    expect(first?.type).toBe('task.dispatched')
    expect(second?.type).toBe('task.progress')
    expect(third?.type).toBe('task.completed')

    if (first?.type === 'task.dispatched') {
      expect(first.data.issueNumber).toBe(42)
      expect(first.data.brief).toBe('fix the thing')
    }
    if (second?.type === 'task.progress') {
      expect(second.data.message).toBe('working on it')
    }
    if (third?.type === 'task.completed') {
      expect(third.data.exitCode).toBe(0)
    }
  })
})
