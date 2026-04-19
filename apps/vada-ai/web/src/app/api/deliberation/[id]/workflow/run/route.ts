// BENCH-ONLY: This route executes the full deliberation server-side via the
// Mastra crucible workflow. In production (Step 6), the browser drives agent
// invocation directly; this route is used for benchmarking and regression testing.
//
// SECURITY: apiKey transits server memory for the lifetime of this request only.
// It is never persisted. See followups.md (Step 5.5) for the observability
// hazard and required tracer redaction before production use.
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser, getSessionWithTranscript } from '@/db/queries'
import { mastra } from '@/mastra'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id: sessionId } = await params

  // Ownership check — all workflow steps trust the sessionId passed via
  // getInitData(), so this is the single auth gate for the entire workflow run.
  const session = await getSessionForUser(sessionId, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const url = new URL(req.url)
  const sync = url.searchParams.get('sync') === 'true'

  let apiKey: string | undefined
  try {
    const body = await req.json()
    if (typeof body?.apiKey === 'string') apiKey = body.apiKey
  } catch {
    // no body or non-JSON — apiKey stays undefined (Ollama / keyless path)
  }

  const wf = mastra.getWorkflow('crucible')
  const run = await wf.createRun()

  if (sync) {
    const result = await run.start({ inputData: { sessionId, apiKey } })
    if (result.status === 'failed') {
      return Response.json({ error: 'Workflow failed', details: result.error }, { status: 500 })
    }
    const fresh = await getSessionWithTranscript(sessionId)
    return Response.json({
      state: fresh?.state ?? null,
      terminalState: fresh?.terminalState ?? null
    })
  }

  // Fire and forget — caller polls session state via /api/sessions/[id]
  run.start({ inputData: { sessionId, apiKey } })
  return Response.json({ sessionId })
}
