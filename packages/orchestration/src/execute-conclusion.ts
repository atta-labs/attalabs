import 'server-only'
import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import { RequestContext } from '@mastra/core/request-context'
import type { RouteProvider } from '@atta/models'
import { resolveModel } from './model-resolver'

export type ConclusionPhase = 'synthesize' | 'audit' | 'revise' | 'reaudit'

export interface ConclusionTurnInput {
  phase: ConclusionPhase
  systemPrompt: string
  userPrompt: string
  model: { provider: RouteProvider; modelId: string }
  apiKey?: string
}

export interface ConclusionTurnResult {
  phase: ConclusionPhase
  content: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

type ConclusionRequestContext = {
  provider: RouteProvider
  modelId: string
  apiKey: string | undefined
  systemPrompt: string
}

// Cached by "provider:modelId" — system prompt varies per call and is injected
// via RequestContext, so agent identity is stable across phases and questions.
const conclusionAgentCache = new Map<string, Agent>()

function getConclusionAgent(provider: RouteProvider, modelId: string): Agent {
  const key = `${provider}:${modelId}`
  if (!conclusionAgentCache.has(key)) {
    conclusionAgentCache.set(
      key,
      new Agent({
        id: `conclusion-${key}`,
        name: `Conclusion (${provider}/${modelId})`,
        instructions: ({ requestContext }) => (requestContext.all as ConclusionRequestContext).systemPrompt,
        // TRANSITIONAL: same cast as executeAgentTurn — Mastra npm-aliases
        // @ai-sdk/provider as both v5 and v6, causing structural type divergence
        // at compile time despite being identical objects at runtime. Remove once
        // Mastra aligns fully on AI SDK v6.
        model: ({ requestContext }) => {
          const { provider, modelId, apiKey } = requestContext.all as ConclusionRequestContext
          return resolveModel(provider, modelId, apiKey) as unknown as MastraModelConfig
        }
      })
    )
  }
  return conclusionAgentCache.get(key)!
}

export async function executeConclusionTurn(input: ConclusionTurnInput): Promise<ConclusionTurnResult> {
  const { phase, systemPrompt, userPrompt, model, apiKey } = input

  if (!apiKey && model.provider !== 'ollama') {
    throw new Error(`executeConclusionTurn: missing API key for provider "${model.provider}"`)
  }

  const agent = getConclusionAgent(model.provider, model.modelId)

  const requestContext = new RequestContext<ConclusionRequestContext>([
    ['provider', model.provider],
    ['modelId', model.modelId],
    ['apiKey', apiKey],
    ['systemPrompt', systemPrompt]
  ])

  const start = Date.now()
  const result = await agent.generate(userPrompt, { requestContext })

  return {
    phase,
    content: result.text,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    durationMs: Date.now() - start
  }
}
