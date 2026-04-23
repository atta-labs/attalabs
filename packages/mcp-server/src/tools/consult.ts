import { compile } from '@atta/engine'
import type { Team } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { reviewerProfiles, type ReviewerProfileName } from '../reviewer-profiles.js'
import { logSession } from '../session-logger.js'

// Sonnet 4.6 pricing (USD per million tokens, May 2026)
const PRICING = { input: 3.0, output: 15.0 }

const DEFAULT_MODEL = process.env.VADA_MODEL ?? 'claude-sonnet-4-6'

export interface ConsultInput {
  prompt: string
  reviewer_profile: ReviewerProfileName
}

export interface ConsultOutput {
  response: string
  session_id: string
  session_url: string
  cost_breakdown: {
    estimated_usd: number
    tokens_input: number
    tokens_output: number
    duration_ms: number
  }
}

/**
 * Run a single-turn Vāda reviewer consultation.
 *
 * Compiles a Solo workflow for the requested reviewer profile, executes it
 * via LangGraphAdapter (cognitive router included), persists the session to
 * Postgres, and returns the reviewer's response with cost metadata.
 */
export async function runConsult(input: ConsultInput, apiKey: string): Promise<ConsultOutput> {
  const agent = reviewerProfiles[input.reviewer_profile]

  const team: Team = {
    name: 'Consult',
    description: `Single ${agent.name} review`,
    agents: [agent],
    workflow: { type: 'solo' }
  }

  const plan = compile({ team, question: input.prompt, model: DEFAULT_MODEL })

  const adapter = new LangGraphAdapter({ apiKey })
  const startedAt = Date.now()
  const conclusion = await adapter.execute({ plan, customVars: {} })
  const durationMs = Date.now() - startedAt

  const estimatedUsd =
    (conclusion.totalTokensInput * PRICING.input + conclusion.totalTokensOutput * PRICING.output) / 1_000_000

  // Generate session ID upfront so it's always available even if DB write fails
  const sessionId = crypto.randomUUID()

  await logSession({
    id: sessionId,
    toolName: 'vada__deliberate_brokered',
    reviewerProfile: input.reviewer_profile,
    prompt: input.prompt,
    response: conclusion.content,
    costUsd: estimatedUsd.toFixed(6),
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    toolCalls: null,
    durationMs
  })

  return {
    response: conclusion.content,
    session_id: sessionId,
    session_url: `https://vada.ai/s/${sessionId}`,
    cost_breakdown: {
      estimated_usd: estimatedUsd,
      tokens_input: conclusion.totalTokensInput,
      tokens_output: conclusion.totalTokensOutput,
      duration_ms: durationMs
    }
  }
}
