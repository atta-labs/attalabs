import { auth } from '@atta/auth/hooks'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getBenchmarkMetrics,
  getOrCreateUser,
  getSessionWithTranscriptForUser,
  saveBaselineMetrics
} from '@/db/queries'

const BaselineSchema = z.object({
  answer: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  tokensInput: z.number().int().nullable().optional(),
  tokensOutput: z.number().int().nullable().optional(),
  elapsedMs: z.number().int().min(0)
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await getOrCreateUser(clerkId, '')
  const session = await getSessionWithTranscriptForUser(id, clerkId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Only accept baseline writes when benchmark was explicitly enabled for
  // the session at start time — i.e. the benchmark_metrics row exists.
  const metrics = await getBenchmarkMetrics(id)
  if (!metrics) return NextResponse.json({ error: 'Benchmark not enabled for this session' }, { status: 400 })

  const body = await request.json()
  const parsed = BaselineSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  await saveBaselineMetrics(id, {
    answer: parsed.data.answer,
    provider: parsed.data.provider,
    modelId: parsed.data.modelId,
    tokensInput: parsed.data.tokensInput ?? null,
    tokensOutput: parsed.data.tokensOutput ?? null,
    elapsedMs: parsed.data.elapsedMs
  })
  return NextResponse.json({ ok: true })
}
