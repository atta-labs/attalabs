import { auth } from '@atta/auth/hooks'
import { NextResponse } from 'next/server'
import { getBenchmarkMetrics, getOrCreateUser, getSessionWithTranscriptForUser } from '@/db/queries'

// Lightweight polling endpoint. The /deliberation/[id] page SSRs the
// benchmark state once; the useJudgeBenchmark hook polls this endpoint after
// terminal to pick up the baseline landing (which the fire-and-forget call
// from /deliberate completes on its own schedule).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const user = await getOrCreateUser(clerkId, '')
  const session = await getSessionWithTranscriptForUser(id, user.id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const metrics = await getBenchmarkMetrics(id)
  if (!metrics) return NextResponse.json({ enabled: false })

  return NextResponse.json({
    enabled: true,
    baselineAvailable: !!metrics.baselineAnswer,
    baselineAnswer: metrics.baselineAnswer ?? null,
    judgeAvailable: !!metrics.judgeResponse
  })
}
