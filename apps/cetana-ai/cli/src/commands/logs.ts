import { createReadStream, existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { StateManager, taskLogPath } from '@atta/cetana-coordinator'
import { loadConfig } from '../lib/config.js'

export async function logsCommand(args: string[]): Promise<void> {
  const [taskIdArg, ...rest] = args

  if (!taskIdArg) {
    console.error('Usage: cetana logs <task-id> [--follow] [--since <timestamp>]')
    process.exit(1)
  }

  const follow = rest.includes('--follow')
  const sinceIdx = rest.indexOf('--since')
  const sinceTimestamp = sinceIdx !== -1 ? rest[sinceIdx + 1] : undefined

  const config = loadConfig()
  if (!config) {
    console.error('Error: No config found. Run `cetana init` to set up Cetana.')
    process.exit(1)
  }

  // Resolve task-id via prefix match
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
    // Try exact match even if not in state (task may be from a previous session)
    taskId = taskIdArg
  }

  const logPath = taskLogPath(taskId)

  if (!existsSync(logPath)) {
    console.error(`Error: No log found for task ${taskId}`)
    process.exit(1)
  }

  // Read and filter existing content
  const content = await readFile(logPath, 'utf-8')
  const lines = content.split('\n').filter((l) => l.trim().length > 0)

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as { ts: string }
      if (sinceTimestamp && event.ts <= sinceTimestamp) continue
      process.stdout.write(`${line}\n`)
    } catch {
      // Skip malformed lines
    }
  }

  if (!follow) return

  // Follow mode: tail-f equivalent using polling
  let lastSize = statSync(logPath).size
  const POLL_INTERVAL = 500

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
          const newLines = buffer.split('\n').filter((l) => l.trim().length > 0)
          for (const line of newLines) {
            try {
              const event = JSON.parse(line) as { ts: string }
              if (sinceTimestamp && event.ts <= sinceTimestamp) continue
              process.stdout.write(`${line}\n`)
            } catch {
              // Skip malformed lines
            }
          }
          lastSize = currentSize
        })
        stream.on('error', (err) => {
          clearInterval(interval)
          reject(err)
        })
      } catch {
        clearInterval(interval)
        reject(new Error('Log file disappeared'))
      }
    }, POLL_INTERVAL)

    // Keep running until SIGINT
    process.on('SIGINT', () => {
      clearInterval(interval)
      _resolve()
    })
  })
}
