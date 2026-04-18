import { z } from 'zod'
import { auth } from '@atta/auth/hooks'
import { bumpDeliberationMetrics, getBenchmarkMetrics, getOrCreateUser, getSessionForUser } from '@/db/queries'
import { recordTurn } from '@/engine/turn'

const TurnSchema = z.object({
  turnId: z.string(),
  content: z.string(),
  phase: z.enum(['run_agent', 'synthesize', 'audit', 'revise', 'reaudit']),
  agent: z.string().optional(),
  round: z.number().int().optional(),
  // Benchmark-mode metrics — null when provider didn't report tokens. Folded
  // into benchmark_metrics only when benchmark was enabled for this session.
  tokensInput: z.number().int().nullable().optional(),
  tokensOutput: z.number().int().nullable().optional(),
  elapsedMs: z.number().int().min(0).optional()
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionForUser(id, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const body = await req.json()
  const parsed = TurnSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  await recordTurn(id, user.id, parsed.data)

  // Only touch benchmark_metrics when the row exists (opt-in flag at start).
  if (parsed.data.elapsedMs !== undefined) {
    const metrics = await getBenchmarkMetrics(id)
    if (metrics) {
      await bumpDeliberationMetrics(id, {
        tokensInput: parsed.data.tokensInput ?? null,
        tokensOutput: parsed.data.tokensOutput ?? null,
        elapsedMs: parsed.data.elapsedMs
      })
    }
  }

  return Response.json({ ok: true })
}
