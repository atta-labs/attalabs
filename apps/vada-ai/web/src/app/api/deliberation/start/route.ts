import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getDailySessionCount, createSession } from '@/db/queries'
import { DAILY_SESSION_LIMIT, DEFAULT_ROOM } from '@/schemas'
import { storeEphemeralKey, storeEphemeralProviderKey } from '@/engine/pending-keys'
import { validateModelConfig } from '@/engine/agents'
import { z } from 'zod'

const AgentModelEntry = z.object({
  provider: z.enum(['groq', 'google', 'anthropic', 'openrouter']),
  modelId: z.string()
})

const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  agents: z.array(z.string()).min(2).max(6).optional(),
  provider: z.enum(['groq', 'google', 'anthropic', 'openrouter']).optional(),
  modelId: z.string().optional(),
  apiKey: z.string().optional(),
  agentModels: z.record(z.string(), AgentModelEntry).optional(),
  apiKeys: z.record(z.string(), z.string()).optional()
})

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = StartSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const user = await getOrCreateUser(clerkId, '')
  const dailyCount = await getDailySessionCount(user.id)

  if (dailyCount >= DAILY_SESSION_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached. You have ${DAILY_SESSION_LIMIT} deliberations per day.` },
      { status: 429 }
    )
  }

  const agents = parsed.data.agents ?? DEFAULT_ROOM.map((a) => a.role)

  // Validate LLM connectivity before creating the session.
  // Per-agent mode validates each unique provider; global mode validates single config.
  if (parsed.data.agentModels && parsed.data.apiKeys) {
    const seen = new Set<string>()
    for (const cfg of Object.values(parsed.data.agentModels)) {
      if (seen.has(cfg.provider)) continue
      seen.add(cfg.provider)
      const validation = await validateModelConfig({
        provider: cfg.provider,
        modelId: cfg.modelId,
        apiKey: parsed.data.apiKeys[cfg.provider]
      })
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 503 })
      }
    }
  } else {
    const globalModelConfig = {
      provider:
        parsed.data.provider ??
        (process.env.DEFAULT_PROVIDER as 'groq' | 'google' | 'anthropic' | 'openrouter') ??
        'groq',
      modelId: parsed.data.modelId ?? process.env.DEFAULT_MODEL_ID ?? 'llama-3.3-70b-versatile',
      ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {})
    }
    const validation = await validateModelConfig(globalModelConfig)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 503 })
    }
  }

  const session = await createSession(
    user.id,
    parsed.data.question,
    agents,
    parsed.data.provider,
    parsed.data.modelId,
    parsed.data.agentModels
  )

  if (parsed.data.apiKey) {
    storeEphemeralKey(session.id, parsed.data.apiKey)
  }
  if (parsed.data.apiKeys) {
    for (const [provider, key] of Object.entries(parsed.data.apiKeys)) {
      storeEphemeralProviderKey(session.id, provider, key)
    }
  }

  return NextResponse.json({ session_id: session.id })
}
