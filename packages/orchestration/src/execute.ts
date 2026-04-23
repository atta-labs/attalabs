import 'server-only'
import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import { RequestContext } from '@mastra/core/request-context'
import type { AgentRole } from '@vada/agents'
import type { RouteProvider } from '@atta/models'
import type { DeliberationAgent, DeliberationContext, DeliberationResult } from './types'
import { resolveModel } from './model-resolver'

// Per-request values injected via RequestContext so the singleton Agent
// resolves model + instructions fresh each call without re-instantiation.
type VadaRequestContext = {
  provider: RouteProvider
  modelId: string
  apiKey: string | undefined
  question: string
  round: number
  hasWhispers: boolean
}

// Module-level singleton cache — one Mastra Agent per role, created lazily.
// The Agent captures the DeliberationAgent's instructions closure at creation
// time; per-call variance (provider, modelId, apiKey, question, round) flows
// through RequestContext at generate() time.
const agentCache = new Map<AgentRole, Agent>()

function getOrCreate(deliberationAgent: DeliberationAgent): Agent {
  if (!agentCache.has(deliberationAgent.role)) {
    agentCache.set(
      deliberationAgent.role,
      new Agent({
        id: deliberationAgent.role,
        name: deliberationAgent.name,
        instructions: ({ requestContext }) => deliberationAgent.instructions(requestContext.all as DeliberationContext),
        // TRANSITIONAL: as unknown as MastraModelConfig is required because Mastra's
        // dep tree npm-aliases @ai-sdk/provider as both v5 and v6, causing the
        // LanguageModel structural type to diverge at compile time despite being
        // identical objects at runtime. Remove the cast once Mastra drops the v5
        // alias and aligns fully on AI SDK v6.
        model: ({ requestContext }) => {
          const { provider, modelId, apiKey } = requestContext.all as VadaRequestContext
          return resolveModel(provider, modelId, apiKey) as unknown as MastraModelConfig
        }
      })
    )
  }
  return agentCache.get(deliberationAgent.role)!
}

export async function executeAgentTurn(
  agent: DeliberationAgent,
  prompt: string,
  ctx: DeliberationContext
): Promise<DeliberationResult> {
  if (!ctx.apiKey && ctx.provider !== 'ollama') {
    throw new Error(`executeAgentTurn: missing API key for provider "${ctx.provider}"`)
  }

  const mastraAgent = getOrCreate(agent)

  const requestContext = new RequestContext<VadaRequestContext>([
    ['provider', ctx.provider],
    ['modelId', ctx.modelId],
    ['apiKey', ctx.apiKey],
    ['question', ctx.question],
    ['round', ctx.round],
    ['hasWhispers', ctx.hasWhispers]
  ])

  const result = await mastraAgent.generate(prompt, { requestContext })

  return {
    text: result.text,
    finishReason: result.finishReason ?? 'stop',
    usage: {
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens
    }
  }
}
