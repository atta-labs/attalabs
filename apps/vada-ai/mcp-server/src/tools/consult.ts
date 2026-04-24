import { compile } from '@atta/engine'
import type { Team } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { reviewerProfiles, type ReviewerProfileName } from '../reviewer-profiles'
import { logSession } from '../session-logger'

// Sonnet 4.6 pricing (USD per million tokens, May 2026)
const PRICING = { input: 3.0, output: 15.0 }

const DEFAULT_MODEL = process.env.VADA_MODEL ?? 'claude-sonnet-4-6'

const REVIEWER_TEMPLATE = '{{question}}'

export interface ConsultInput {
  brief: string
  reviewers: ReviewerProfileName[]
}

export interface ReviewerResponse {
  reviewer: ReviewerProfileName
  response: string
}

export interface ConsultOutput {
  responses: ReviewerResponse[]
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
 * Run a multi-reviewer Vāda consultation using BrokeredWorkflow.
 *
 * Reviewers run sequentially, independently — no cross-reviewer context.
 * Returns per-reviewer responses with cost metadata.
 */
export async function runConsult(input: ConsultInput, apiKey: string): Promise<ConsultOutput> {
  const selectedAgents = input.reviewers.map((r) => reviewerProfiles[r])

  const team: Team = {
    name: 'BrokeredConsult',
    description: `Brokered consultation: ${input.reviewers.join(', ')}`,
    agents: selectedAgents,
    workflow: {
      type: 'brokered',
      reviewers: input.reviewers.map((r) => ({
        agentName: reviewerProfiles[r].name,
        messageTemplate: REVIEWER_TEMPLATE
      }))
    }
  }

  const plan = compile({ team, question: input.brief, model: DEFAULT_MODEL })

  const adapter = new LangGraphAdapter({ apiKey })
  const startedAt = Date.now()
  const conclusion = await adapter.execute({ plan, customVars: {} })
  const durationMs = Date.now() - startedAt

  const estimatedUsd =
    (conclusion.totalTokensInput * PRICING.input + conclusion.totalTokensOutput * PRICING.output) / 1_000_000

  const sessionId = crypto.randomUUID()

  await logSession({
    id: sessionId,
    toolName: 'vada__consult',
    reviewerProfile: input.reviewers.join(','),
    prompt: input.brief,
    response: conclusion.content,
    costUsd: estimatedUsd.toFixed(6),
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    toolCalls: null,
    durationMs
  })

  // Map transcript entries to per-reviewer responses
  const responses: ReviewerResponse[] = conclusion.transcript.map((entry, i) => ({
    reviewer: input.reviewers[i]!,
    response: entry.content
  }))

  return {
    responses,
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
