import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { TASKS_DIR, taskLogPath } from './paths.js'

export type CetanaEvent =
  | {
      ts: string
      type: 'task.dispatched'
      data: { taskId: string; issueNumber: number; brief: string; worktree: string }
    }
  | { ts: string; type: 'task.spawned'; data: { taskId: string; pid: number } }
  | { ts: string; type: 'task.blocked'; data: { taskId: string; question: string; questionId: string } }
  | { ts: string; type: 'task.unblocked'; data: { taskId: string; questionId: string; reply: string } }
  | { ts: string; type: 'task.progress'; data: { taskId: string; message: string } }
  | { ts: string; type: 'task.completed'; data: { taskId: string; prUrl?: string; exitCode: number } }
  | { ts: string; type: 'task.failed'; data: { taskId: string; reason: string; exitCode: number } }

export async function appendEvent(taskId: string, event: CetanaEvent): Promise<void> {
  await mkdir(TASKS_DIR, { recursive: true })
  await appendFile(taskLogPath(taskId), `${JSON.stringify(event)}\n`, 'utf-8')
}

export async function readEvents(taskId: string): Promise<CetanaEvent[]> {
  const logPath = taskLogPath(taskId)
  if (!existsSync(logPath)) return []
  const content = await readFile(logPath, 'utf-8')
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CetanaEvent)
}
