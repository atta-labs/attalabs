import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { createSession, getDailySessionCount, getOrCreateUser, initBenchmarkMetrics } from '@/db/queries'
import { getDailySessionLimit } from '@/schemas'
import { VENDOR_ORDER, resolveVendorByPrefix, type VendorId } from '@atta/models'
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
  // Same normalization the rest of the stack uses: role agents (Strategist,
  // Critic, Synthesizer, …) collapse to their `role` string; everything else
  // (Council slots: Gemini / GPT / Grok) passes through under its raw YAML
  // name. `modelByRole` in the deliberation page, and the `agentModels` map
  // we build below, share this exact key space — so a session looked up later
  // can always find a model for every slot under the same key.
  const normalizeAgentKey = (name: string): string => AGENTS[name as AgentName]?.role ?? name
  const agents = roundAgentNames.map(normalizeAgentKey)

  // Build the per-agent resolved model map. Walks `spec.agents` (not just the
  // first round) so synthesizer slots that live in later rounds — e.g.
  // vada-council-synthesis round 2 — also get a default. Each agent's YAML
  // `model` wins; when omitted the spec-level `defaults.model` applies; the
  // provider is resolved by model-id prefix (sync, sufficient for the
  // frontier-class defaults we ship — Anthropic / OpenAI / Google / xAI). An
  // agent whose model resolves to no known prefix is skipped: writing a
  // `provider: null` entry would break the engine's vendor routing.
  const resolvedAgentModels: Record<string, { provider: VendorId; modelId: string }> = {}
  const specDefaultModel = spec.defaults?.model
  for (const agent of spec.agents) {
    const modelId = agent.model ?? specDefaultModel
    if (!modelId) continue
    const provider = resolveVendorByPrefix(modelId)
    if (!provider) continue
    resolvedAgentModels[normalizeAgentKey(agent.name)] = { provider, modelId }
  }
  // Overlay user-provided agentModels — caller wins for any slot the user has
  // configured (the reviewer modal writes per-slot model picks). Normalize
  // incoming keys through the same `AGENTS[name]?.role ?? name` map so a
  // payload posted with raw YAML names ("Synthesizer") collapses onto the
  // same role key ("synthesizer") the defaults already used. Without this
  // normalization the overlay silently misses the role-agent slots.
  if (parsed.data.agentModels) {
    for (const [rawKey, value] of Object.entries(parsed.data.agentModels)) {
      resolvedAgentModels[normalizeAgentKey(rawKey)] = value
    }
  }

  // Model connectivity validation happens in the BROWSER with the user's key.
  // The server has no key to probe with — this is the structural BYOK guarantee.

  const session = await createSession(
    clerkId,
    parsed.data.question,
    agents,
    parsed.data.provider,
    parsed.data.modelId,
    Object.keys(resolvedAgentModels).length > 0 ? resolvedAgentModels : undefined,
    parsed.data.specId
  )
  if (parsed.data.benchmark) {
    await initBenchmarkMetrics(session.id)
  }
  return NextResponse.json({ session_id: session.id, benchmark: !!parsed.data.benchmark })
}
