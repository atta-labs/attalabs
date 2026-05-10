import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { appendEvent } from '../events.js'
import { questionFilePath, replyFilePath, taskDir } from '../paths.js'

const POLL_INTERVAL_MS = 1000
const TIMEOUT_MS = 30 * 60 * 1000

export function createRequestInput() {
  return {
    name: 'cetana_request_input',
    description:
      'Ask the principal a question when you are blocked on a decision. Wait for their answer before proceeding. The principal may take several minutes to reply — wait patiently.',
    inputSchema: z.object({
      question: z.string().min(1)
    }),
    async handler(input: { question: string }) {
      const taskId = process.env.CETANA_TASK_ID
      if (!taskId) {
        return {
          content: [{ type: 'text' as const, text: 'Error: CETANA_TASK_ID env var not set.' }],
          isError: true
        }
      }

      const questionId = randomUUID()
      const dir = taskDir(taskId)
      await mkdir(dir, { recursive: true })

      await writeFile(questionFilePath(taskId), JSON.stringify({ question: input.question, questionId }), 'utf-8')

      await appendEvent(taskId, {
        ts: new Date().toISOString(),
        type: 'task.blocked',
        data: { taskId, question: input.question, questionId }
      })

      const startTime = Date.now()
      while (true) {
        const replyPath = replyFilePath(taskId)
        if (existsSync(replyPath)) {
          const raw = await readFile(replyPath, 'utf-8')
          const { reply } = JSON.parse(raw) as { reply: string; questionId: string }

          await unlink(replyPath).catch(() => undefined)
          await unlink(questionFilePath(taskId)).catch(() => undefined)

          await appendEvent(taskId, {
            ts: new Date().toISOString(),
            type: 'task.unblocked',
            data: { taskId, questionId, reply }
          })

          return { content: [{ type: 'text' as const, text: reply }] }
        }

        if (Date.now() - startTime > TIMEOUT_MS) {
          await appendEvent(taskId, {
            ts: new Date().toISOString(),
            type: 'task.failed',
            data: {
              taskId,
              reason: 'Timeout waiting for principal reply',
              exitCode: 1
            }
          })
          return {
            content: [
              {
                type: 'text' as const,
                text: `Timeout after ${TIMEOUT_MS / 60000} minutes. Principal did not reply.`
              }
            ],
            isError: true
          }
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }
    }
  }
}
