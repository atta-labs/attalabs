import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getDailySessionCount, createSession } from '@/db/queries'
import { DAILY_SESSION_LIMIT, DEFAULT_ROOM } from '@/schemas'
import { storeEphemeralKey } from '@/engine/pending-keys'
import { z } from 'zod'

const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  agents: z.array(z.string()).min(2).max(6).optional(),
  provider: z.enum(['groq', 'google', 'anthropic', 'openrouter']).optional(),
  modelId: z.string().optional(),
  apiKey: z.string().optional()
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
  const session = await createSession(user.id, parsed.data.question, agents, parsed.data.provider, parsed.data.modelId)

  // Store API key ephemerally — consumed once by stream route, never persisted
  if (parsed.data.apiKey) {
    storeEphemeralKey(session.id, parsed.data.apiKey)
  }

  return NextResponse.json({ session_id: session.id })
}
