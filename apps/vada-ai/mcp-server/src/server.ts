import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { runConsult } from './tools/consult'
import { runDeliberate } from './tools/deliberate'
import { type ReviewerProfileName, reviewerProfiles } from './reviewer-profiles'

const CONSULT_TOOL_DESCRIPTION = `Consult 2–3 Vāda reviewer agents in parallel for focused, orthogonal perspectives (Brokered mode).

Use when you want multiple independent critiques without a full multi-agent deliberation.
Faster and cheaper than vada__deliberate. Each reviewer runs independently — no cross-reviewer context.

Reviewer profiles:
  - strategist: maps the landscape, identifies opportunities and paths forward
  - critic: identifies weaknesses, blind spots, and unstated assumptions
  - devils_advocate: argues the opposing view to stress-test an idea

Returns: responses (per-reviewer), session_id, session_url, cost_breakdown.

Example: vada__consult(
  brief="Should we adopt GraphQL as our primary API layer for a team of 8 engineers?",
  reviewers=["strategist", "critic"]
)`

const DELIBERATE_TOOL_DESCRIPTION = `Run a multi-agent deliberation on a difficult question. Use when you
want structured debate across multiple perspectives producing a
committed conclusion with a full audit trail. This is slower and more
expensive than vada__deliberate_brokered — use for high-stakes decisions where
the reasoning trail matters.

Returns: content (final conclusion), session_id, session_url (audit
trail), terminal_state (CLEAN/REVISED/MAX_REVISIONS), cost_breakdown.

Example: vada__deliberate(
  question="Should we migrate from Postgres to CockroachDB given our
            multi-region requirements?",
  team="sparring"
)

Parameters:
  question: The question or decision to deliberate on
  team (optional): "sparring" (default, 2 agents) or "crucible"
                   (4-7 agents, heavier)

Runtime: Sparring ~30-90s; Crucible 2-5min. Client timeout permitting.`

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
        description: CONSULT_TOOL_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            brief: {
              type: 'string',
              description: 'The question or proposal to review (compressed, reviewer-ready framing)'
            },
            reviewers: {
              type: 'array',
              items: { type: 'string', enum: VALID_PROFILES },
              minItems: 2,
              maxItems: 5,
              description: 'Reviewer profiles to consult: strategist, critic, devils_advocate (min 2)'
            }
          },
          required: ['brief', 'reviewers']
        }
      },
      {
        name: 'vada__deliberate',
        description: DELIBERATE_TOOL_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            question: {
              type: 'string',
              description: 'The question or decision to deliberate on'
            },
            team: {
              type: 'string',
              enum: ['sparring', 'crucible'],
              description: 'sparring (default, 2 agents) or crucible (4-7 agents, heavier)'
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

    if (name === 'vada__consult') {
      const brief = args.brief
      const reviewers = args.reviewers

      if (typeof brief !== 'string' || !brief.trim()) {
        return {
          content: [{ type: 'text' as const, text: 'Error: brief must be a non-empty string' }],
          isError: true
        }
      }
      if (
        !Array.isArray(reviewers) ||
        reviewers.length < 2 ||
        !reviewers.every((r) => VALID_PROFILES.includes(r as ReviewerProfileName))
      ) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: reviewers must be an array of 2–5 profiles from: ${VALID_PROFILES.join(', ')}`
            }
          ],
          isError: true
        }
      }

      try {
        const result = await runConsult({ brief, reviewers: reviewers as ReviewerProfileName[] }, apiKey)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
      }
    }

    if (name === 'vada__deliberate') {
      const question = args.question
      const team = args.team

      if (typeof question !== 'string' || !question.trim()) {
        return {
          content: [{ type: 'text' as const, text: 'Error: question must be a non-empty string' }],
          isError: true
        }
      }
      if (team !== undefined && typeof team !== 'string') {
        return {
          content: [{ type: 'text' as const, text: 'Error: team must be "sparring" or "crucible"' }],
          isError: true
        }
      }

      try {
        const result = await runDeliberate({ question, team: team as string | undefined }, apiKey)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  return server
}
