import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CETANA_HOME = join(homedir(), '.cetana')
export const TASKS_DIR = join(CETANA_HOME, 'tasks')
export const CONFIG_PATH = join(CETANA_HOME, 'config.json')

function readRepoPath(): string {
  const fallback = join(homedir(), 'code', 'atta')
  try {
    if (!existsSync(CONFIG_PATH)) return fallback
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as { repoPath?: unknown }
    return typeof raw?.repoPath === 'string' && raw.repoPath ? raw.repoPath : fallback
  } catch {
    return fallback
  }
}

export const ATTA_REPO_PATH = readRepoPath()
export const WORKTREES_BASE = join(ATTA_REPO_PATH, '.worktrees')

export const taskLogPath = (taskId: string) => join(TASKS_DIR, `${taskId}.jsonl`)
export const taskDir = (taskId: string) => join(TASKS_DIR, taskId)
export const questionFilePath = (taskId: string) => join(taskDir(taskId), 'question.json')
export const replyFilePath = (taskId: string) => join(taskDir(taskId), 'reply.json')
export const worktreePath = (issueNumber: number) => join(WORKTREES_BASE, `issue-${issueNumber}`)
