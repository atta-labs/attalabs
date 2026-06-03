import { createReadStream, existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { StateManager, taskLogPath } from '@atta/cetana-coordinator'
import type { CetanaEvent } from '@atta/cetana-coordinator'
import { loadConfig } from '../lib/config.js'

function formatTime(ts: string): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `[${hh}:${mm}:${ss}]`
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return `${s.slice(0, n)}…`
}

export function renderProgressMessage(message: string, toolNameMap: Map<string, string>): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(message)
  } catch {
    return []
  }

  if (typeof parsed !== 'object' || parsed === null) return []
  const msg = parsed as Record<string, unknown>
  const lines: string[] = []

  if (msg.type === 'assistant') {
    const inner = msg.message as Record<string, unknown> | undefined
    const content = inner?.content as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(content)) return []

    for (const item of content) {
      if (item.type === 'text') {
        const text = String(item.text ?? '')
          .trim()
          .replace(/\n/g, ' ')
        if (text) lines.push(`🤖 ${truncate(text, 120)}`)
      } else if (item.type === 'tool_use') {
        const name = String(item.name ?? 'unknown')
        const toolId = String(item.id ?? '')
        if (toolId) toolNameMap.set(toolId, name)
        const inputStr = truncate(JSON.stringify(item.input ?? {}), 80)
        lines.push(`🔧 ${name}(${inputStr})`)
      }
    }
  } else if (msg.type === 'user') {
    const inner = msg.message as Record<string, unknown> | undefined
    const content = inner?.content as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(content)) return []

    for (const item of content) {
      if (item.type === 'tool_result') {
        const toolId = String(item.tool_use_id ?? '')
        const toolName = toolNameMap.get(toolId) ?? 'tool'
        let output = ''
        if (typeof item.content === 'string') {
          output = item.content
        } else if (Array.isArray(item.content)) {
          const textItem = (item.content as Array<Record<string, unknown>>).find((c) => c.type === 'text')
          output = String(textItem?.text ?? '')
        }
        output = truncate(output.trim().replace(/\n/g, ' '), 80)
        lines.push(`✅ ${toolName} → ${output}`)
      }
    }
  }

  return lines
}

export function renderEvent(event: CetanaEvent, toolNameMap: Map<string, string>): string[] {
  const time = formatTime(event.ts)
  const lines: string[] = []

  switch (event.type) {
    case 'task.dispatched':
      lines.push(`${time} 🚀 Task started — issue #${event.data.issueNumber}`)
      break
    case 'task.blocked':
      lines.push(`${time} ⏸  BLOCKED — "${truncate(event.data.question, 120)}"`)
      break
    case 'task.completed':
      lines.push(`${time} ✅ Task completed`)
      break
    case 'task.failed':
      lines.push(`${time} 💥 CRASHED — ${event.data.reason}`)
      break
    case 'task.progress': {
      const rendered = renderProgressMessage(event.data.message, toolNameMap)
      for (const l of rendered) lines.push(`${time} ${l}`)
      break
    }
    // task.spawned, task.unblocked, unknown runtime types: skip silently
  }

  return lines
}

function isTerminalEvent(event: CetanaEvent): boolean {
  return event.type === 'task.completed' || event.type === 'task.failed'
}

function parseEvents(text: string): CetanaEvent[] {
  const result: CetanaEvent[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      result.push(JSON.parse(line) as CetanaEvent)
    } catch {
      // skip malformed lines
    }
  }
  return result
}

export async function watchCommand(args: string[]): Promise<void> {
  const [taskIdArg] = args

  if (!taskIdArg) {
    console.error('Usage: cetana watch <task-id>')
    process.exit(1)
  }

  const config = loadConfig()
  if (!config) {
    console.error('Error: No config found. Run `cetana init` to set up Cetana.')
    process.exit(1)
  }

  // Resolve task ID via prefix match (same pattern as cetana logs)
  const state = new StateManager()
  await state.hydrate()
  const allTasks = state.listAll()
  const matches = allTasks.filter((t) => t.taskId.startsWith(taskIdArg))

  let taskId: string
  if (matches.length === 1 && matches[0]) {
    taskId = matches[0].taskId
  } else if (matches.length > 1) {
    console.error(`Error: Ambiguous task ID prefix '${taskIdArg}' matches ${matches.length} tasks.`)
    process.exit(1)
  } else {
    taskId = taskIdArg
  }

  const logPath = taskLogPath(taskId)

  if (!existsSync(logPath)) {
    console.error(`Error: No task found with ID ${taskId}`)
    process.exit(1)
  }

  const toolNameMap = new Map<string, string>()
  let sawTerminal = false

  // Read and render all existing lines
  const content = await readFile(logPath, 'utf-8')
  for (const event of parseEvents(content)) {
    for (const line of renderEvent(event, toolNameMap)) {
      process.stdout.write(`${line}\n`)
    }
    if (isTerminalEvent(event)) sawTerminal = true
  }

  if (sawTerminal) return

  // Live follow mode: poll every 500ms for new lines, exit on terminal event
  let lastSize = statSync(logPath).size

  await new Promise<void>((_resolve, reject) => {
    const interval = setInterval(() => {
      try {
        const currentSize = statSync(logPath).size
        if (currentSize <= lastSize) return

        const stream = createReadStream(logPath, { start: lastSize, end: currentSize - 1, encoding: 'utf-8' })
        let buffer = ''
        stream.on('data', (chunk: Buffer | string) => {
          buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
        })
        stream.on('end', () => {
          for (const event of parseEvents(buffer)) {
            for (const line of renderEvent(event, toolNameMap)) {
              process.stdout.write(`${line}\n`)
            }
            if (isTerminalEvent(event)) sawTerminal = true
          }
          lastSize = currentSize
          if (sawTerminal) {
            clearInterval(interval)
            _resolve()
          }
        })
        stream.on('error', (err) => {
          clearInterval(interval)
          reject(err)
        })
      } catch {
        clearInterval(interval)
        reject(new Error('Log file disappeared or became unreadable'))
      }
    }, 500)

    process.on('SIGINT', () => {
      clearInterval(interval)
      _resolve()
    })
  })
}
