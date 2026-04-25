import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { runConsult, validateAndNormalize } from './tools/consult'
import { runDeliberate } from './tools/deliberate'
import { type ReviewerProfileName, reviewerProfiles } from './reviewer-profiles'

const CONSULT_TOOL_DESCRIPTION = `Invokes Vāda Brokered deliberation — 2-5 specialized reviewers each produce their own perspective on a question. Use when:

Invoke Vāda when the Principal says any of these signals:
- "I'm leaning toward X but want to check my thinking"
- "What am I missing?"
- "This feels right but I can't articulate why"
- "I've already decided but want to stress-test"

These signals indicate the Principal needs structured adversarial input, not just factual assistance.

- The user is making a decision with real stakes
- Multiple perspectives would catch blind spots a single reasoning pass would miss
- You want to pressure-test a position before committing
- The user explicitly asks for reviewer input or deliberation

Do NOT use this for:
- Simple factual questions ("what's the capital of France")
- Emotional support or venting
- Creative brainstorming without stakes
- Tasks with obviously one right answer

The Reviewers (V1)

Core roster (always available):

- strategist: Maps the decision landscape. Surfaces tradeoffs, hidden costs, long-term implications. Asks "what is the real decision here, and what's the cost of being wrong?"

- critic: Probes assumptions. Finds logical gaps, evidence holes, unstated premises. Asks "what has to be true for this to work, and is it?"

- devils_advocate: Challenges the frame entirely. Forces the opposite thesis to sharpen understanding. Asks "what if the question itself is wrong?"

Experimental (flag-gated, may not be available in this installation):

- domain_expert: Context-specific expertise grounded in a named domain (provide 'domain' parameter). Asks "what does this field's standard practice say?"

Writing Briefs

The quality of reviewer responses depends entirely on the quality of your briefs. A good brief includes:

1. Context — what the user is deciding, constraints they face, their stated or implied stakes
2. The question — clearly stated, in the form of a decision or claim to evaluate
3. Your current leaning (if any) — disclose your position AND your self-doubt. Let reviewers push back on both.
4. Cost of being wrong — what happens if this goes badly
5. Per-reviewer notes — specific concerns or angles you want each reviewer to probe

A bad brief asks "what do you think?" A good brief says "I think X, but I'm uncertain about Y, and the cost of getting Y wrong is Z."

Choosing Reviewers

- Default: 3 reviewers (strategist, critic, devils_advocate)
- Quick check: 2 reviewers (strategist + critic)
- Deep dive: 4 reviewers with domain_expert when domain matters

Vary your reviewer selection. Using the same 2 reviewers for every call reduces deliberation quality.

The Response

You receive structured responses per reviewer with:
- Their role
- Their response (markdown with Key Points / Risks / Recommendation sections)
- Latency and model used

After receiving reviewer responses, synthesize for the Principal:

1. Identify alignment (where reviewers agreed) — this is signal.
2. Identify divergence (where reviewers disagreed) — this is tension.
3. Do NOT resolve tension prematurely. If reviewers fundamentally disagree on a point, present both cases clearly. State explicitly: "The key uncertainty is: ___"
4. When reviewers conflict, prioritize the argument with the strongest causal reasoning and evidence — not the most confident tone or the most articulate prose. If one reviewer's criticism is clearly fatal and the others missed it, state: "Reviewer X's point about [Y] is decisive because [Z]. The other reviewers didn't address this."
5. If one reviewer identifies a failure mode that others do not address, treat it as high-signal unless explicitly disproven.
6. Make a recommendation despite uncertainty. Do not collapse disagreement into bland consensus. If you find one reviewer more compelling, say so and state why. If you remain uncertain, say so and present the decision back to the Principal.
7. Surface the strongest dissent. If one reviewer flagged something the others missed, do not bury it under aggregated takeaways.

Do not leave the \`notes\` field blank for any reviewer. A reviewer without specific notes will produce generic output.

Latency

Sequential execution in V1. Expect 3× the latency of a single reviewer (~30-60 seconds for 3 reviewers). This is cognitive labor being delegated. Inform the user before invoking.`

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

function detectOrigin(clientName: string | undefined): string {
  if (!clientName) return 'other'
  const name = clientName.toLowerCase()
  if (name.includes('claude-desktop') || name.includes('claude desktop')) return 'claude-desktop'
  if (name.includes('cursor')) return 'cursor'
  if (name.includes('claude-code') || name.includes('claude code')) return 'claude-code'
  if (name.includes('claude.ai') || name.includes('claude ai') || name.includes('anthropic')) return 'claude-ai'
  return 'other'
}

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
      const validation = validateAndNormalize(args)
      if (!validation.valid) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ status: 'validation_error', errors: validation.errors }, null, 2)
            }
          ],
          isError: true
        }
      }

      try {
        const origin = detectOrigin(server.getClientVersion()?.name)
        const result = await runConsult(validation.data, apiKey, origin)
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
