import { compileSpec } from '@atta/engine'
import { LangGraphAdapter, createMultiVendorLlmCall } from '@atta/adapter-langgraph'
import type { ProviderKeys } from '@atta/adapter-langgraph'
import { lookupSpec } from '../spec-registry'
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
  /** Parsed structured output from the synthesis agent. Null when the spec has no output_schema (e.g. a0-baseline, brokered). */
  structured: unknown | null
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

export async function runDeliberate(input: DeliberateInput, providerKeys: ProviderKeys): Promise<DeliberateOutput> {
  const spec = lookupSpec(input.team ?? 'sparring')
  const plan = compileSpec(spec, input.question, DEFAULT_MODEL)

  const llmCall = createMultiVendorLlmCall(providerKeys)
  const adapter = new LangGraphAdapter({ apiKey: providerKeys.anthropic })
  const startedAt = Date.now()
  const conclusion = await adapter.execute({ plan, customVars: {}, llmCall })
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
    structured: conclusion.structured ?? null,
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
