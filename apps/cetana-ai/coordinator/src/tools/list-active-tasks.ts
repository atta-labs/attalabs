import { z } from 'zod'
import type { StateManager } from '../state.js'

export function createListActiveTasks(deps: { state: StateManager }) {
  return {
    name: 'cetana.list_active_tasks',
    description:
      'List all active Cetana tasks. Shows task ID, status, issue number, and any pending question for blocked tasks.',
    inputSchema: z.object({}),
    async handler(_input: Record<string, never>) {
      const tasks = deps.state.list()
      if (tasks.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No active tasks.' }]
        }
      }
      const formatted = tasks.map((t) => {
        const lines = [
          `Task: ${t.taskId}`,
          `  Status: ${t.status}`,
          `  Issue: #${t.issueNumber}`,
          `  Worktree: ${t.worktree}`,
          `  Started: ${t.startedAt}`
        ]
        if (t.pendingQuestion) {
          lines.push(`  BLOCKED — Question ID: ${t.pendingQuestion.questionId}`)
          lines.push(`  Question: ${t.pendingQuestion.question}`)
        }
        return lines.join('\n')
      })
      return {
        content: [{ type: 'text' as const, text: formatted.join('\n\n') }]
      }
    }
  }
}
