import { auth } from '@atta/auth/hooks'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBenchmarkMetrics, getOrCreateUser, getSessionWithTranscriptForUser, saveJudgeMetrics } from '@/db/queries'

const JudgeSchema = z.object({
  response: z.string().min(1),
  provider: z.string().nullable().optional(),
  modelId: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  tokensInput: z.number().int().nullable().optional(),
  tokensOutput: z.number().int().nullable().optional(),
  elapsedMs: z.number().int().min(0)
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const user = await getOrCreateUser(clerkId, '')
  const session = await getSessionWithTranscriptForUser(id, user.id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const metrics = await getBenchmarkMetrics(id)
  if (!metrics) return NextResponse.json({ error: 'Benchmark not enabled for this session' }, { status: 400 })

  const body = await request.json()
  const parsed = JudgeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  await saveJudgeMetrics(id, {
    response: parsed.data.response,
    provider: parsed.data.provider ?? null,
    modelId: parsed.data.modelId ?? null,
    diagnosis: parsed.data.diagnosis ?? null,
    tokensInput: parsed.data.tokensInput ?? null,
    tokensOutput: parsed.data.tokensOutput ?? null,
    elapsedMs: parsed.data.elapsedMs
  })
  return NextResponse.json({ ok: true })
}
