import { compile } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { lookupTeam } from '../teams-registry'
import { logSession } from '../session-logger'

// Sonnet 4.6 pricing (USD per million tokens, May 2026)
const PRICING = { input: 3.0, output: 15.0 }

const DEFAULT_MODEL = process.env.VADA_MODEL ?? 'claude-sonnet-4-6'

export interface DeliberateInput {
  question: string
  team?: string
}

export interface DeliberateOutput {
  content: string
  session_id: string
  session_url: string
  terminal_state: string
  cost_breakdown: {
    estimated_usd: number
    tokens_input: number
    tokens_output: number
    duration_ms: number
  }
}

export async function runDeliberate(input: DeliberateInput, apiKey: string): Promise<DeliberateOutput> {
  const teamName = input.team ?? 'sparring'
  const team = lookupTeam(teamName)

  const plan = compile({ team, question: input.question, model: DEFAULT_MODEL })

  const adapter = new LangGraphAdapter({ apiKey })
  const startedAt = Date.now()
  const conclusion = await adapter.execute({ plan, customVars: {} })
  const durationMs = Date.now() - startedAt

  const estimatedUsd =
    (conclusion.totalTokensInput * PRICING.input + conclusion.totalTokensOutput * PRICING.output) / 1_000_000

  const sessionId = crypto.randomUUID()

  await logSession({
    id: sessionId,
    toolName: 'vada__deliberate',
    prompt: input.question,
    response: conclusion.content,
    terminalState: conclusion.terminalState,
    transcript: conclusion.transcript,
    costUsd: estimatedUsd.toFixed(6),
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    toolCalls: null,
    durationMs
  })

  return {
    content: conclusion.content,
    session_id: sessionId,
    session_url: `https://vada.ai/s/${sessionId}`,
    terminal_state: conclusion.terminalState,
    cost_breakdown: {
      estimated_usd: estimatedUsd,
      tokens_input: conclusion.totalTokensInput,
      tokens_output: conclusion.totalTokensOutput,
      duration_ms: durationMs
    }
  }
}
