// POST /api/benchmark/baseline
// Runs a single-shot LLM call server-side and persists the result as the
// baseline benchmark answer. apiKey transits server memory for this request
// only — same contract as /workflow/run. See /trust.
import 'server-only'
import { auth } from '@atta/auth/hooks'
import type { RouteProvider } from '@atta/models'
import { resolveModel } from '@atta/models/server'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBenchmarkMetrics, getOrCreateUser, getSessionForUser, saveBaselineMetrics } from '@/db/queries'

export const maxDuration = 120

const Schema = z.object({
  sessionId: z.string(),
  question: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  apiKey: z.string()
})

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { sessionId, question, provider, modelId, apiKey } = parsed.data

  const user = await getOrCreateUser(clerkId, '')

  const session = await getSessionForUser(sessionId, user.id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 403 })

  const metrics = await getBenchmarkMetrics(sessionId)
  if (!metrics) return NextResponse.json({ error: 'Benchmark not enabled for this session' }, { status: 404 })

  if (metrics.baselineAnswer) return NextResponse.json({ error: 'Baseline already recorded' }, { status: 409 })

  const start = Date.now()
  const model = resolveModel(provider as RouteProvider, modelId, apiKey)
  const result = await generateText({
    model,
    system: "Answer the user's question directly. No framing, no caveats. If code is useful, include it.",
    prompt: question
  })
  const elapsedMs = Date.now() - start

  await saveBaselineMetrics(sessionId, {
    answer: result.text,
    provider,
    modelId,
    tokensInput: result.usage?.inputTokens ?? null,
    tokensOutput: result.usage?.outputTokens ?? null,
    elapsedMs
  })

  return NextResponse.json({ ok: true })
}
