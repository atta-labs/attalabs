import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { TASKS_DIR } from './paths.js'
import { readEvents } from './events.js'
import type { CetanaEvent } from './events.js'

export interface ActiveTask {
  taskId: string
  issueNumber: number
  status: 'running' | 'blocked' | 'completed' | 'failed'
  worktree: string
  pid?: number
  pendingQuestion?: { questionId: string; question: string }
  startedAt: string
}

export class StateManager {
  private tasks: Map<string, ActiveTask> = new Map()

  async hydrate(): Promise<void> {
    if (!existsSync(TASKS_DIR)) return
    const files = await readdir(TASKS_DIR)
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'))
    for (const file of jsonlFiles) {
      const taskId = file.replace('.jsonl', '')
      const events = await readEvents(taskId)
      for (const event of events) {
        this.applyEvent(event)
      }
    }
  }

  private applyEvent(event: CetanaEvent): void {
    switch (event.type) {
      case 'task.dispatched': {
        this.tasks.set(event.data.taskId, {
          taskId: event.data.taskId,
          issueNumber: event.data.issueNumber,
          status: 'running',
          worktree: event.data.worktree,
          startedAt: event.ts
        })
        break
      }
      case 'task.spawned': {
        const task = this.tasks.get(event.data.taskId)
        if (task) task.pid = event.data.pid
        break
      }
      case 'task.blocked': {
        const task = this.tasks.get(event.data.taskId)
        if (task) {
          task.status = 'blocked'
          task.pendingQuestion = { questionId: event.data.questionId, question: event.data.question }
        }
        break
      }
      case 'task.unblocked': {
        const task = this.tasks.get(event.data.taskId)
        if (task) {
          task.status = 'running'
          task.pendingQuestion = undefined
        }
        break
      }
      case 'task.completed': {
        const task = this.tasks.get(event.data.taskId)
        if (task) task.status = 'completed'
        break
      }
      case 'task.failed': {
        const task = this.tasks.get(event.data.taskId)
        if (task) task.status = 'failed'
        break
      }
    }
  }

  list(): ActiveTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running' || t.status === 'blocked')
  }

  listAll(): ActiveTask[] {
    return Array.from(this.tasks.values())
  }

  get(taskId: string): ActiveTask | undefined {
    return this.tasks.get(taskId)
  }

  setBlocked(taskId: string, questionId: string, question: string): void {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    task.status = 'blocked'
    task.pendingQuestion = { questionId, question }
  }

  setUnblocked(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    task.status = 'running'
    task.pendingQuestion = undefined
  }

  setSpawned(taskId: string, pid: number): void {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    task.pid = pid
  }

  setCompleted(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    task.status = 'completed'
    task.pendingQuestion = undefined
  }

  setFailed(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)
    task.status = 'failed'
    task.pendingQuestion = undefined
  }

  register(task: ActiveTask): void {
    this.tasks.set(task.taskId, task)
  }
}
