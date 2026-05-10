import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createRequestInput } from './tools/request-input.js'

async function main() {
  const taskId = process.env.CETANA_TASK_ID
  if (!taskId) {
    process.stderr.write('[cetana-executor] Fatal error: CETANA_TASK_ID env var not set.\n')
    process.exit(1)
  }

  const requestInput = createRequestInput()

  const server = new Server({ name: 'cetana-executor', version: '0.1.0' }, { capabilities: { tools: {} } })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: requestInput.name,
        description: requestInput.description,
        inputSchema: {
          type: 'object' as const,
          properties: {
            question: {
              type: 'string',
              minLength: 1,
              description: 'The question to ask the principal.'
            }
          },
          required: ['question']
        }
      }
    ]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params
    const args = request.params.arguments as Record<string, unknown>

    if (name === requestInput.name) {
      const input = z.object({ question: z.string().min(1) }).parse(args)
      return requestInput.handler(input)
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write(`[cetana-executor] MCP server started for task ${taskId}\n`)
}

main().catch((err) => {
  process.stderr.write(`[cetana-executor] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
