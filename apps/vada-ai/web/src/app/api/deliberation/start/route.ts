import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { createSession, getDailySessionCount, getOrCreateUser, initBenchmarkMetrics } from '@/db/queries'
import { getDailySessionLimit } from '@/schemas'
import { VENDOR_ORDER, type VendorId } from '@atta/models'
import { loadYamlFromCatalog, listPublicSpecs } from '@atta/engine'
import { AGENTS } from '@/components/agents/visuals'
import type { AgentName } from '@/components/agents/visuals'
import { z } from 'zod'

const providerEnum = z.enum(VENDOR_ORDER as [VendorId, ...VendorId[]])

const AgentModelEntry = z.object({ provider: providerEnum, modelId: z.string() })

// Allowed spec IDs — excludes experimental specs (baselines, brokered variants).
// Evaluated once at module load so every request pays no filesystem cost.
const ALLOWED_SPEC_IDS = new Set(listPublicSpecs().map((s) => s.id))

// Note: no apiKey, no apiKeys. Keys stay in the browser. See /trust.
const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  specId: z.string().refine((id) => ALLOWED_SPEC_IDS.has(id), { message: 'Unknown spec ID' }),
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

  await getOrCreateUser(clerkId, '')
  const dailyLimit = getDailySessionLimit()
  const dailyCount = await getDailySessionCount(clerkId)
  if (dailyCount >= dailyLimit) {
    return NextResponse.json(
      { error: `Daily limit reached. You have ${dailyLimit} deliberations per day.` },
      { status: 429 }
    )
  }

  const spec = loadYamlFromCatalog(parsed.data.specId)
  const roundAgentNames: string[] = spec.rounds[0]?.agents.map((a) => a.name) ?? []
  const agents = roundAgentNames.map((name) => AGENTS[name as AgentName]?.role ?? name)

  // Model connectivity validation happens in the BROWSER with the user's key.
  // The server has no key to probe with — this is the structural BYOK guarantee.

  const session = await createSession(
    clerkId,
    parsed.data.question,
    agents,
    parsed.data.provider,
    parsed.data.modelId,
    parsed.data.agentModels,
    parsed.data.specId
  )
  if (parsed.data.benchmark) {
    await initBenchmarkMetrics(session.id)
  }
  return NextResponse.json({ session_id: session.id, benchmark: !!parsed.data.benchmark })
}
