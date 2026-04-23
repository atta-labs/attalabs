import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { runConsult } from './tools/consult.js'
import { type ReviewerProfileName, reviewerProfiles } from './reviewer-profiles.js'

const TOOL_DESCRIPTION = `Consult a Vāda reviewer agent for a specific perspective on a question or proposal.

Use when you want one focused critique, strategic analysis, or counter-argument rather
than a full multi-agent deliberation. Returns the reviewer's response synchronously.

Reviewer profiles:
  - strategist: builds the strongest possible case for a position, with evidence
  - critic: identifies weaknesses, blind spots, and unstated assumptions
  - devils_advocate: argues the opposing view to stress-test an idea`

const VALID_PROFILES = Object.keys(reviewerProfiles) as ReviewerProfileName[]

/**
 * Creates and configures the Vāda MCP server.
 *
 * Uses the low-level Server class to avoid TypeScript depth-limit issues
 * in McpServer's generic inference. The tool is registered with a plain
 * JSON Schema object so no Zod inference is needed at the server layer.
 */
export function createServer(apiKey: string): Server {
  const server = new Server({ name: 'vada', version: '1.0.0' }, { capabilities: { tools: {} } })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'vada__consult',
        description: TOOL_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            prompt: {
              type: 'string',
              description: 'The question or proposal to review'
            },
            reviewer_profile: {
              type: 'string',
              enum: VALID_PROFILES,
              description: 'Which reviewer perspective to use: strategist, critic, or devils_advocate'
            }
          },
          required: ['prompt', 'reviewer_profile']
        }
      }
    ]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'vada__consult') {
      throw new Error(`Unknown tool: ${request.params.name}`)
    }

    const args = request.params.arguments as Record<string, unknown>
    const prompt = args.prompt
    const reviewerProfile = args.reviewer_profile

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: prompt must be a non-empty string' }],
        isError: true
      }
    }
    if (typeof reviewerProfile !== 'string' || !VALID_PROFILES.includes(reviewerProfile as ReviewerProfileName)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: reviewer_profile must be one of: ${VALID_PROFILES.join(', ')}`
          }
        ],
        isError: true
      }
    }

    try {
      const result = await runConsult({ prompt, reviewer_profile: reviewerProfile as ReviewerProfileName }, apiKey)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true
      }
    }
  })

  return server
}
