import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { spawnClaudeCode } from '../claude-spawner.js'
import type { CetanaConfig } from '../config.js'
import { appendEvent } from '../events.js'
import { getIssue, postIssueComment } from '../github.js'
import { worktreePath } from '../paths.js'
import type { StateManager } from '../state.js'
import { createWorktree } from '../worktree.js'

export const InputSchema = z.object({
  issue_number: z.number().int().positive(),
  brief: z.string().min(50),
  base_branch: z.string().default('main')
})

export function createDispatchTask(deps: { state: StateManager; config: CetanaConfig }) {
  return {
    name: 'cetana.dispatch_task',
    description:
      'Dispatch a Claude Code agent to work on a GitHub Issue. Creates a worktree, spawns the agent with the given brief, returns a task_id. Use cetana.list_active_tasks to monitor progress.',
    inputSchema: InputSchema,
    async handler(input: z.infer<typeof InputSchema>) {
      const { issue_number, brief, base_branch } = input
      const taskId = randomUUID()

      const issue = await getIssue(issue_number)

      const wtPath = worktreePath(issue_number)
      await createWorktree(issue_number, base_branch)

      const ts = new Date().toISOString()
      await appendEvent(taskId, {
        ts,
        type: 'task.dispatched',
        data: { taskId, issueNumber: issue_number, brief, worktree: wtPath }
      })

      deps.state.register({
        taskId,
        issueNumber: issue_number,
        status: 'running',
        worktree: wtPath,
        startedAt: ts
      })

      const result = await spawnClaudeCode({
        taskId,
        brief,
        worktreePath: wtPath,
        model: deps.config.defaults.claudeModel,
        permissionMode: deps.config.defaults.permissionMode,
        onStdout: (line) => {
          appendEvent(taskId, {
            ts: new Date().toISOString(),
            type: 'task.progress',
            data: { taskId, message: line }
          }).catch(() => undefined)
        },
        onExit: (code) => {
          const exitTs = new Date().toISOString()
          if (code === 0) {
            deps.state.setCompleted(taskId)
            appendEvent(taskId, {
              ts: exitTs,
              type: 'task.completed',
              data: { taskId, exitCode: code }
            }).catch(() => undefined)
          } else {
            deps.state.setFailed(taskId)
            appendEvent(taskId, {
              ts: exitTs,
              type: 'task.failed',
              data: { taskId, reason: `Process exited with code ${code}`, exitCode: code }
            }).catch(() => undefined)
          }
          postIssueComment(
            issue_number,
            code === 0 ? `Cetana: Task ${taskId} completed (exit 0).` : `Cetana: Task ${taskId} failed (exit ${code}).`
          ).catch(() => undefined)
        }
      })

      deps.state.setSpawned(taskId, result.pid)
      await appendEvent(taskId, {
        ts: new Date().toISOString(),
        type: 'task.spawned',
        data: { taskId, pid: result.pid }
      })

      await postIssueComment(
        issue_number,
        `Cetana: Dispatching agent for "${issue.title}"\nTask ID: \`${taskId}\`\nWorktree: \`${wtPath}\``
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ taskId, worktree: wtPath, pid: result.pid, issue: issue.title })
          }
        ]
      }
    }
  }
}
