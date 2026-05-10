import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { loadConfig } from './config.js'
import { StateManager } from './state.js'
import { createDispatchTask, InputSchema as DispatchInputSchema } from './tools/dispatch-task.js'
import { createListActiveTasks } from './tools/list-active-tasks.js'
import { createReplyToBlockedTask } from './tools/reply-to-blocked-task.js'
import { z } from 'zod'

async function main() {
  const config = loadConfig()
  const state = new StateManager()
  await state.hydrate()

  const dispatchTask = createDispatchTask({ state, config })
  const listActiveTasks = createListActiveTasks({ state })
  const replyToBlockedTask = createReplyToBlockedTask({ state })

  const server = new Server({ name: 'cetana-strategist', version: '0.1.0' }, { capabilities: { tools: {} } })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: dispatchTask.name,
        description: dispatchTask.description,
        inputSchema: {
          type: 'object' as const,
          properties: {
            issue_number: {
              type: 'number',
              description: 'GitHub issue number to work on.'
            },
            brief: {
              type: 'string',
              minLength: 50,
              description: 'Instructions for the agent. Min 50 chars.'
            },
            base_branch: {
              type: 'string',
              description: 'Branch to base the worktree on. Defaults to main.'
            }
          },
          required: ['issue_number', 'brief']
        }
      },
      {
        name: listActiveTasks.name,
        description: listActiveTasks.description,
        inputSchema: {
          type: 'object' as const,
          properties: {}
        }
      },
      {
        name: replyToBlockedTask.name,
        description: replyToBlockedTask.description,
        inputSchema: {
          type: 'object' as const,
          properties: {
            task_id: {
              type: 'string',
              description: 'The task ID to reply to.'
            },
            reply: {
              type: 'string',
              description: "Your answer to the blocked task's question."
            }
          },
          required: ['task_id', 'reply']
        }
      }
    ]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params
    const args = request.params.arguments as Record<string, unknown>

    if (name === dispatchTask.name) {
      const input = DispatchInputSchema.parse(args)
      return dispatchTask.handler(input)
    }

    if (name === listActiveTasks.name) {
      return listActiveTasks.handler({} as Record<string, never>)
    }

    if (name === replyToBlockedTask.name) {
      const input = z.object({ task_id: z.string(), reply: z.string() }).parse(args)
      return replyToBlockedTask.handler(input)
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write('[cetana-strategist] MCP server started. Listening on stdio.\n')
}

main().catch((err) => {
  process.stderr.write(`[cetana-strategist] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
