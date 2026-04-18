import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { createSession, getDailySessionCount, getOrCreateUser, initBenchmarkMetrics } from '@/db/queries'
import { DEFAULT_ROOM, getDailySessionLimit } from '@/schemas'
import { ROUTE_PROVIDER_ORDER, type RouteProvider } from '@atta/models'
import { z } from 'zod'

const providerEnum = z.enum(ROUTE_PROVIDER_ORDER as [RouteProvider, ...RouteProvider[]])

const AgentModelEntry = z.object({ provider: providerEnum, modelId: z.string() })

// Note: no apiKey, no apiKeys. Keys stay in the browser. See /trust.
const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  agents: z.array(z.string()).min(2).max(6).optional(),
  provider: providerEnum.optional(),
  modelId: z.string().optional(),
  agentModels: z.record(z.string(), AgentModelEntry).optional(),
  // Opt-in benchmark — when true we create a benchmark_metrics row so the
  // browser can POST baseline + judge results and the engine can aggregate
  // deliberation tokens as they arrive.
  benchmark: z.boolean().optional()
})

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = StartSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const user = await getOrCreateUser(clerkId, '')
  const dailyLimit = getDailySessionLimit()
  const dailyCount = await getDailySessionCount(user.id)
  if (dailyCount >= dailyLimit) {
    return NextResponse.json(
      { error: `Daily limit reached. You have ${dailyLimit} deliberations per day.` },
      { status: 429 }
    )
  }

  const agents = parsed.data.agents ?? DEFAULT_ROOM.map((a) => a.role)

  // Model connectivity validation happens in the BROWSER with the user's key.
  // The server has no key to probe with — this is the structural BYOK guarantee.

  const session = await createSession(
    user.id,
    parsed.data.question,
    agents,
    parsed.data.provider,
    parsed.data.modelId,
    parsed.data.agentModels
  )
  if (parsed.data.benchmark) {
    await initBenchmarkMetrics(session.id)
  }
  return NextResponse.json({ session_id: session.id, benchmark: !!parsed.data.benchmark })
}
