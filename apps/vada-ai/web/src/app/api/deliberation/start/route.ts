import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getDailySessionCount, createSession } from '@/db/queries'
import { getDecryptedApiKey } from '@/db/settings-queries'
import { DAILY_SESSION_LIMIT, DEFAULT_ROOM } from '@/schemas'
import { storeEphemeralKey, storeEphemeralProviderKey } from '@/engine/pending-keys'
import { validateModelConfig } from '@/engine/agents'
import { z } from 'zod'

const AgentModelEntry = z.object({
  provider: z.enum(['anthropic', 'google', 'groq', 'openai', 'openrouter']),
  modelId: z.string()
})

const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  agents: z.array(z.string()).min(2).max(6).optional(),
  provider: z.enum(['anthropic', 'google', 'groq', 'openai', 'openrouter']).optional(),
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

  // Fill missing API keys from DB settings if not provided in request body
  let resolvedApiKey = parsed.data.apiKey
  if (!resolvedApiKey && parsed.data.provider) {
    resolvedApiKey = (await getDecryptedApiKey(user.id, parsed.data.provider)) ?? undefined
  }

  const resolvedApiKeys: Record<string, string> = { ...(parsed.data.apiKeys ?? {}) }
  if (parsed.data.agentModels) {
    for (const cfg of Object.values(parsed.data.agentModels)) {
      if (!resolvedApiKeys[cfg.provider]) {
        const key = await getDecryptedApiKey(user.id, cfg.provider)
        if (key) resolvedApiKeys[cfg.provider] = key
      }
    }
  }

  // Validate LLM connectivity before creating the session.
  // Per-agent mode validates each unique provider; global mode validates single config.
  if (parsed.data.agentModels && Object.keys(resolvedApiKeys).length > 0) {
    const seen = new Set<string>()
    for (const cfg of Object.values(parsed.data.agentModels)) {
      if (seen.has(cfg.provider)) continue
      seen.add(cfg.provider)
      const validation = await validateModelConfig({
        provider: cfg.provider,
        modelId: cfg.modelId,
        apiKey: resolvedApiKeys[cfg.provider]
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
      ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {})
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

  if (resolvedApiKey) {
    storeEphemeralKey(session.id, resolvedApiKey)
  }
  if (Object.keys(resolvedApiKeys).length > 0) {
    for (const [provider, key] of Object.entries(resolvedApiKeys)) {
      storeEphemeralProviderKey(session.id, provider, key)
    }
  }

  return NextResponse.json({ session_id: session.id })
}
