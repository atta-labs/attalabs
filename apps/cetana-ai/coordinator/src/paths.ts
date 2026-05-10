import { homedir } from 'node:os'
import { join } from 'node:path'

export const CETANA_HOME = join(homedir(), '.cetana')
export const TASKS_DIR = join(CETANA_HOME, 'tasks')
export const CONFIG_PATH = join(CETANA_HOME, 'config.json')
export const ATTA_REPO_PATH = join(homedir(), 'code', 'atta')
export const WORKTREES_BASE = join(ATTA_REPO_PATH, '.worktrees')

export const taskLogPath = (taskId: string) => join(TASKS_DIR, `${taskId}.jsonl`)
export const taskDir = (taskId: string) => join(TASKS_DIR, taskId)
export const questionFilePath = (taskId: string) => join(taskDir(taskId), 'question.json')
export const replyFilePath = (taskId: string) => join(taskDir(taskId), 'reply.json')
export const worktreePath = (issueNumber: number) => join(WORKTREES_BASE, `issue-${issueNumber}`)
