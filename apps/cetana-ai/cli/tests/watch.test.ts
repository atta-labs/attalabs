import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { taskLogPath, TASKS_DIR } from '@atta/cetana-coordinator'
import type { CetanaEvent } from '@atta/cetana-coordinator'
import { renderEvent, renderProgressMessage } from '../src/commands/watch.js'
import { mkdirSync } from 'node:fs'

const CLI_PATH = join(import.meta.dir, '../src/index.ts')
const TEST_TASK_ID = `watch-test-${Date.now()}`

async function runCli(args: string[], timeoutMs = 5000): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', 'run', CLI_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const result = await Promise.race([
    Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(
      ([exitCode, stdout, stderr]) => ({ exitCode, stdout, stderr, timedOut: false as const })
    ),
    new Promise<{ timedOut: true; exitCode: null; stdout: string; stderr: string }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true, exitCode: null, stdout: '', stderr: '' }), timeoutMs)
    )
  ])

  if (result.timedOut) {
    proc.kill()
    throw new Error(`cetana watch timed out after ${timeoutMs}ms — process did not exit`)
  }

  return result
}

async function writeMockLog(taskId: string, events: CetanaEvent[]): Promise<void> {
  mkdirSync(TASKS_DIR, { recursive: true })
  const lines = `${events.map((e) => JSON.stringify(e)).join('\n')}\n`
  await writeFile(taskLogPath(taskId), lines, 'utf-8')
}

afterEach(async () => {
  const logPath = taskLogPath(TEST_TASK_ID)
  if (existsSync(logPath)) {
    await unlink(logPath)
  }
})

// ─── Unit tests: renderProgressMessage ───────────────────────────────────────

describe('renderProgressMessage', () => {
  it('renders assistant text content with 🤖 prefix', () => {
    const toolNameMap = new Map<string, string>()
    const message = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Running pre-flight checks now.' }]
      }
    })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('🤖')
    expect(result[0]).toContain('Running pre-flight checks now.')
  })

  it('truncates assistant text longer than 120 chars', () => {
    const toolNameMap = new Map<string, string>()
    const longText = 'A'.repeat(200)
    const message = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: longText }] }
    })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(1)
    expect(result[0]?.length).toBeLessThan(140)
    expect(result[0]).toContain('…')
  })

  it('renders tool_use content with 🔧 prefix', () => {
    const toolNameMap = new Map<string, string>()
    const message = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_abc123',
            name: 'Bash',
            input: { command: 'git status', description: 'Check status' }
          }
        ]
      }
    })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('🔧')
    expect(result[0]).toContain('Bash')
    expect(toolNameMap.get('toolu_abc123')).toBe('Bash')
  })

  it('truncates tool input longer than 80 chars', () => {
    const toolNameMap = new Map<string, string>()
    const message = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_xyz',
            name: 'Read',
            input: { file_path: '/very/long/path/that/is/definitely/longer/than/eighty/characters/in/total.ts' }
          }
        ]
      }
    })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('…')
  })

  it('renders tool_result with tool name from lookup map', () => {
    const toolNameMap = new Map<string, string>([['toolu_abc123', 'Bash']])
    const message = JSON.stringify({
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_abc123',
            content: 'On branch main\nnothing to commit',
            is_error: false
          }
        ]
      }
    })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('✅')
    expect(result[0]).toContain('Bash')
    expect(result[0]).toContain('→')
  })

  it('skips thinking content blocks', () => {
    const toolNameMap = new Map<string, string>()
    const message = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'thinking', thinking: 'Internal deliberation...' }]
      }
    })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for non-JSON message strings', () => {
    const toolNameMap = new Map<string, string>()
    const result = renderProgressMessage('not valid json {{{', toolNameMap)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for system event messages', () => {
    const toolNameMap = new Map<string, string>()
    const message = JSON.stringify({ type: 'system', subtype: 'hook_started', hook_id: 'abc' })
    const result = renderProgressMessage(message, toolNameMap)
    expect(result).toHaveLength(0)
  })
})

// ─── Unit tests: renderEvent ──────────────────────────────────────────────────

describe('renderEvent', () => {
  const ts = '2026-06-01T10:30:45.000Z'

  it('renders task.dispatched with 🚀', () => {
    const event: CetanaEvent = {
      ts,
      type: 'task.dispatched',
      data: { taskId: 'abc', issueNumber: 42, brief: 'do work', worktree: '/tmp/wt' }
    }
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('🚀')
    expect(lines[0]).toContain('issue #42')
  })

  it('renders task.blocked with ⏸ and truncated question', () => {
    const longQ = 'Q'.repeat(200)
    const event: CetanaEvent = {
      ts,
      type: 'task.blocked',
      data: { taskId: 'abc', question: longQ, questionId: 'q1' }
    }
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('⏸')
    expect(lines[0]).toContain('BLOCKED')
    expect(lines[0]).toContain('…')
    expect((lines[0] ?? '').length).toBeLessThan(200)
  })

  it('renders task.completed with ✅', () => {
    const event: CetanaEvent = {
      ts,
      type: 'task.completed',
      data: { taskId: 'abc', exitCode: 0 }
    }
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('✅')
    expect(lines[0]).toContain('Task completed')
  })

  it('renders task.failed with 💥', () => {
    const event: CetanaEvent = {
      ts,
      type: 'task.failed',
      data: { taskId: 'abc', reason: 'process exited with code 1', exitCode: 1 }
    }
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('💥')
    expect(lines[0]).toContain('CRASHED')
  })

  it('skips task.spawned events (no output)', () => {
    const event: CetanaEvent = {
      ts,
      type: 'task.spawned',
      data: { taskId: 'abc', pid: 12345 }
    }
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(0)
  })

  it('skips task.unblocked events (no output)', () => {
    const event: CetanaEvent = {
      ts,
      type: 'task.unblocked',
      data: { taskId: 'abc', questionId: 'q1', reply: 'proceed' }
    }
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(0)
  })

  it('skips unknown event types (heartbeat, etc.) — no output', () => {
    // Cast to simulate a runtime unknown type (e.g. task.heartbeat)
    const event = { ts, type: 'task.heartbeat', data: { taskId: 'abc' } } as unknown as CetanaEvent
    const lines = renderEvent(event, new Map())
    expect(lines).toHaveLength(0)
  })

  it('includes a timestamp prefix [HH:MM:SS] on all rendered lines', () => {
    const event: CetanaEvent = {
      ts,
      type: 'task.completed',
      data: { taskId: 'abc', exitCode: 0 }
    }
    const lines = renderEvent(event, new Map())
    expect(lines[0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\]/)
  })
})

// ─── CLI integration tests ────────────────────────────────────────────────────

describe('cetana watch — unknown task ID', () => {
  it('exits with code 1 and prints error for completely unknown ID', async () => {
    const { exitCode, stderr } = await runCli(['watch', '00000000-ffff-ffff-ffff-000000000000'])
    expect(exitCode).toBe(1)
    expect(stderr.length).toBeGreaterThan(0)
  })
})

describe('cetana watch — completed task', () => {
  it('prints all events and exits when task is already completed', async () => {
    const ts1 = '2026-01-01T00:00:00.000Z'
    const ts2 = '2026-01-01T00:00:01.000Z'
    const ts3 = '2026-01-01T00:00:02.000Z'

    await writeMockLog(TEST_TASK_ID, [
      {
        ts: ts1,
        type: 'task.dispatched',
        data: { taskId: TEST_TASK_ID, issueNumber: 7, brief: 'test', worktree: '/tmp/wt' }
      },
      {
        ts: ts2,
        type: 'task.progress',
        data: {
          taskId: TEST_TASK_ID,
          message: JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Working...' }] } })
        }
      },
      { ts: ts3, type: 'task.completed', data: { taskId: TEST_TASK_ID, exitCode: 0 } }
    ])

    const { exitCode, stdout } = await runCli(['watch', TEST_TASK_ID])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('🚀')
    expect(stdout).toContain('issue #7')
    expect(stdout).toContain('🤖')
    expect(stdout).toContain('Working...')
    expect(stdout).toContain('✅')
    expect(stdout).toContain('Task completed')
  })
})

describe('cetana watch — partial task ID resolution', () => {
  it('resolves a task by 8-char prefix', async () => {
    await writeMockLog(TEST_TASK_ID, [
      {
        ts: '2026-01-01T00:00:00.000Z',
        type: 'task.dispatched',
        data: { taskId: TEST_TASK_ID, issueNumber: 9, brief: 'test', worktree: '/tmp/wt' }
      },
      { ts: '2026-01-01T00:00:01.000Z', type: 'task.completed', data: { taskId: TEST_TASK_ID, exitCode: 0 } }
    ])

    const prefix = TEST_TASK_ID.slice(0, 8)
    const { exitCode, stdout } = await runCli(['watch', prefix])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('issue #9')
    expect(stdout).toContain('Task completed')
  })
})
