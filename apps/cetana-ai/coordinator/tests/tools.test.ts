import { describe, it, expect, beforeEach } from 'bun:test'
import { InputSchema as DispatchTaskSchema } from '../src/tools/dispatch-task.js'
import { createListActiveTasks } from '../src/tools/list-active-tasks.js'
import { createReplyToBlockedTask } from '../src/tools/reply-to-blocked-task.js'
import { createRequestInput } from '../src/tools/request-input.js'
import { StateManager } from '../src/state.js'
import type { ActiveTask } from '../src/state.js'

function makeTask(overrides: Partial<ActiveTask> = {}): ActiveTask {
  return {
    taskId: 'task-abc',
    issueNumber: 1,
    status: 'running',
    worktree: '/tmp/wt-1',
    startedAt: new Date().toISOString(),
    ...overrides
  }
}

describe('dispatch-task inputSchema', () => {
  it('accepts valid input', () => {
    const result = DispatchTaskSchema.safeParse({
      issue_number: 1,
      brief: 'x'.repeat(50)
    })
    expect(result.success).toBe(true)
  })

  it("applies default base_branch of 'main'", () => {
    const result = DispatchTaskSchema.safeParse({
      issue_number: 5,
      brief: 'a'.repeat(50)
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.base_branch).toBe('main')
    }
  })

  it('rejects negative issue_number', () => {
    const result = DispatchTaskSchema.safeParse({
      issue_number: -1,
      brief: 'x'.repeat(50)
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero issue_number', () => {
    const result = DispatchTaskSchema.safeParse({
      issue_number: 0,
      brief: 'x'.repeat(50)
    })
    expect(result.success).toBe(false)
  })

  it('rejects brief shorter than 50 characters', () => {
    const result = DispatchTaskSchema.safeParse({
      issue_number: 1,
      brief: 'short'
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer issue_number', () => {
    const result = DispatchTaskSchema.safeParse({
      issue_number: 1.5,
      brief: 'x'.repeat(50)
    })
    expect(result.success).toBe(false)
  })
})

describe('list-active-tasks inputSchema', () => {
  it('accepts empty object', () => {
    const tool = createListActiveTasks({ state: new StateManager() })
    const result = tool.inputSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('reply-to-blocked-task inputSchema', () => {
  it('accepts valid input', () => {
    const tool = createReplyToBlockedTask({ state: new StateManager() })
    const result = tool.inputSchema.safeParse({ task_id: 'abc', reply: 'go ahead' })
    expect(result.success).toBe(true)
  })

  it('rejects missing task_id', () => {
    const tool = createReplyToBlockedTask({ state: new StateManager() })
    const result = tool.inputSchema.safeParse({ reply: 'go ahead' })
    expect(result.success).toBe(false)
  })

  it('rejects missing reply', () => {
    const tool = createReplyToBlockedTask({ state: new StateManager() })
    const result = tool.inputSchema.safeParse({ task_id: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects empty object', () => {
    const tool = createReplyToBlockedTask({ state: new StateManager() })
    const result = tool.inputSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('request-input inputSchema', () => {
  it('accepts a non-empty question', () => {
    const tool = createRequestInput()
    const result = tool.inputSchema.safeParse({ question: 'what should I do?' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty question string', () => {
    const tool = createRequestInput()
    const result = tool.inputSchema.safeParse({ question: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing question', () => {
    const tool = createRequestInput()
    const result = tool.inputSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('StateManager', () => {
  let state: StateManager

  beforeEach(() => {
    state = new StateManager()
  })

  it('starts with empty list', () => {
    expect(state.list()).toEqual([])
  })

  it('register adds a task visible via list() and get()', () => {
    const task = makeTask({ taskId: 'task-1' })
    state.register(task)

    expect(state.list()).toHaveLength(1)
    expect(state.get('task-1')).toEqual(task)
  })

  it('list() only returns running and blocked tasks', () => {
    state.register(makeTask({ taskId: 'r1', status: 'running' }))
    state.register(makeTask({ taskId: 'b1', status: 'blocked' }))
    state.register(makeTask({ taskId: 'c1', status: 'completed' }))
    state.register(makeTask({ taskId: 'f1', status: 'failed' }))

    const listed = state.list()
    expect(listed).toHaveLength(2)
    const ids = listed.map((t) => t.taskId)
    expect(ids).toContain('r1')
    expect(ids).toContain('b1')
  })

  it('get() returns undefined for unknown taskId', () => {
    expect(state.get('nonexistent')).toBeUndefined()
  })

  it('setBlocked transitions status to blocked and sets pendingQuestion', () => {
    state.register(makeTask({ taskId: 'task-x' }))
    state.setBlocked('task-x', 'qid-1', 'what to do?')

    const task = state.get('task-x')
    expect(task?.status).toBe('blocked')
    expect(task?.pendingQuestion).toEqual({ questionId: 'qid-1', question: 'what to do?' })
  })

  it('setUnblocked transitions status back to running and clears pendingQuestion', () => {
    state.register(makeTask({ taskId: 'task-y' }))
    state.setBlocked('task-y', 'qid-2', 'a question')
    state.setUnblocked('task-y')

    const task = state.get('task-y')
    expect(task?.status).toBe('running')
    expect(task?.pendingQuestion).toBeUndefined()
  })

  it('setCompleted transitions status and removes task from list()', () => {
    state.register(makeTask({ taskId: 'task-z' }))
    state.setCompleted('task-z')

    expect(state.get('task-z')?.status).toBe('completed')
    expect(state.list()).toHaveLength(0)
  })

  it('setBlocked throws on unknown taskId', () => {
    expect(() => state.setBlocked('ghost', 'qid', 'question')).toThrow('Task ghost not found')
  })

  it('setUnblocked throws on unknown taskId', () => {
    expect(() => state.setUnblocked('ghost')).toThrow('Task ghost not found')
  })

  it('setCompleted throws on unknown taskId', () => {
    expect(() => state.setCompleted('ghost')).toThrow('Task ghost not found')
  })

  it('listAll() returns all tasks regardless of status', () => {
    state.register(makeTask({ taskId: 'r1', status: 'running' }))
    state.register(makeTask({ taskId: 'c1', status: 'completed' }))

    expect(state.listAll()).toHaveLength(2)
  })

  it('register with same taskId overwrites previous entry', () => {
    state.register(makeTask({ taskId: 'dup', issueNumber: 1 }))
    state.register(makeTask({ taskId: 'dup', issueNumber: 99 }))

    expect(state.list()).toHaveLength(1)
    expect(state.get('dup')?.issueNumber).toBe(99)
  })
})
