import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { appendEvent } from '../events.js'
import { replyFilePath, taskDir } from '../paths.js'
import type { StateManager } from '../state.js'

export function createReplyToBlockedTask(deps: { state: StateManager }) {
  return {
    name: 'cetana.reply_to_blocked_task',
    description:
      'Reply to a blocked Cetana task. The executor agent will receive your reply as the result of its tool call and continue working.',
    inputSchema: z.object({
      task_id: z.string(),
      reply: z.string()
    }),
    async handler(input: { task_id: string; reply: string }) {
      const task = deps.state.get(input.task_id)
      if (!task) {
        return {
          content: [{ type: 'text' as const, text: `Error: task ${input.task_id} not found.` }],
          isError: true
        }
      }
      if (task.status !== 'blocked') {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: task ${input.task_id} is not blocked (status: ${task.status}).`
            }
          ],
          isError: true
        }
      }

      const questionId = task.pendingQuestion?.questionId ?? randomUUID()
      const dir = taskDir(input.task_id)
      await mkdir(dir, { recursive: true })
      await writeFile(replyFilePath(input.task_id), JSON.stringify({ reply: input.reply, questionId }), 'utf-8')

      await appendEvent(input.task_id, {
        ts: new Date().toISOString(),
        type: 'task.unblocked',
        data: { taskId: input.task_id, questionId, reply: input.reply }
      })

      deps.state.setUnblocked(input.task_id)

      return {
        content: [
          {
            type: 'text' as const,
            text: `Reply sent to task ${input.task_id}. Agent will resume.`
          }
        ]
      }
    }
  }
}
