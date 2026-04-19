import { createDeliberationContext } from '@atta/orchestration'
import type { DeliberationAgent } from '@atta/orchestration'
import { executeAgentTurn } from '@atta/orchestration/server'
import type { RouteProvider } from '@atta/models'
import { z } from 'zod'

export const agentRequestSchema = z
  .object({
    apiKey: z.string().min(1).optional(),
    provider: z.string().min(1),
    modelId: z.string().min(1),
    question: z.string().min(1),
    round: z.number().int().min(1),
    hasWhispers: z.boolean(),
    userPrompt: z.string().min(1)
  })
  .refine((data) => data.provider === 'ollama' || (typeof data.apiKey === 'string' && data.apiKey.length > 0), {
    message: 'apiKey is required for non-Ollama providers',
    path: ['apiKey']
  })

export async function handleAgentRoute(req: Request, agent: DeliberationAgent): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = agentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 422 })
  }

  const { apiKey, provider, modelId, question, round, hasWhispers, userPrompt } = parsed.data

  try {
    const ctx = createDeliberationContext({
      provider: provider as RouteProvider,
      modelId,
      apiKey,
      question,
      round,
      hasWhispers
    })

    const result = await executeAgentTurn(agent, userPrompt, ctx)

    return Response.json({
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
