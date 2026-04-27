import { loadSpec, compileSpec } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { RunInputSchema, type RunInput } from '../schema'

// Sonnet 4.6 pricing (USD per million tokens, May 2026)
const PRICING = { input: 3.0, output: 15.0 }

const DEFAULT_MODEL = process.env.VADA_MODEL ?? 'claude-sonnet-4-6'

export interface RunOutput {
  ok: boolean
  content?: string
  structured?: unknown
  terminalState?: string
  costBreakdown?: {
    estimatedUsd: number
    tokensInput: number
    tokensOutput: number
    durationMs: number
  }
  error?: string
}

export async function runDeliberation(input: unknown, apiKey: string): Promise<RunOutput> {
  try {
    const parsed = RunInputSchema.parse(input)
    return await executeDeliberation(parsed, apiKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Validation failed: ${message}` }
  }
}

async function executeDeliberation(input: RunInput, apiKey: string): Promise<RunOutput> {
  try {
    const spec = loadSpec(input.yaml)
    const model = input.modelOverrides?.default ?? DEFAULT_MODEL
    const plan = compileSpec(spec, input.question, model)

    const adapter = new LangGraphAdapter({ apiKey })
    const startedAt = Date.now()
    const conclusion = await adapter.execute({ plan, customVars: input.customVars ?? {} })
    const durationMs = Date.now() - startedAt

    const estimatedUsd =
      (conclusion.totalTokensInput * PRICING.input + conclusion.totalTokensOutput * PRICING.output) / 1_000_000

    return {
      ok: true,
      content: conclusion.content,
      structured: conclusion.structured ?? undefined,
      terminalState: conclusion.terminalState,
      costBreakdown: {
        estimatedUsd,
        tokensInput: conclusion.totalTokensInput,
        tokensOutput: conclusion.totalTokensOutput,
        durationMs
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Deliberation failed: ${message}` }
  }
}
