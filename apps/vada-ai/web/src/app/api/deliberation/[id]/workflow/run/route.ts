// PRODUCTION: This route executes the full deliberation server-side via the
// Mastra crucible workflow.
//   ?stream=true  — SSE stream; browser consumes events as workflow progresses
//   ?sync=true    — synchronous; bench harness waits for completion
//   (default)     — fire-and-forget; caller polls /api/sessions/[id]
//
// SECURITY: apiKey transits server memory for the lifetime of this request only.
// It is never persisted. SensitiveDataFilter in src/mastra/index.ts redacts it
// from Langfuse traces. See followups.md (Step 5.5) for the observability note.
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser, getSessionWithTranscript } from '@/db/queries'
import { mastra } from '@/mastra'

export const maxDuration = 900 // 15 min — required for long SSE streams on Vercel

const KEEPALIVE_INTERVAL_MS = 15_000
const MAX_DURATION_MS = 15 * 60 * 1_000
const POLL_INTERVAL_MS = 1_000

function sseChunk(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
  const stream = url.searchParams.get('stream') === 'true'

  let apiKey: string | undefined
  try {
    const body = await req.json()
    if (typeof body?.apiKey === 'string') apiKey = body.apiKey
  } catch {
    // no body or non-JSON — apiKey stays undefined (Ollama / keyless path)
  }

  if (sync) {
    const wf = mastra.getWorkflow('crucible')
    const run = await wf.createRun()
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

  if (stream) {
    const initial = await getSessionWithTranscript(sessionId)
    if (!initial) return Response.json({ error: 'Session not found' }, { status: 404 })

    // Only start a new workflow run when the session is PENDING. Reconnects
    // (page reload, browser back/forward) must not spawn a second run.
    const shouldStart = initial.state === 'PENDING'
    if (shouldStart) {
      const wf = mastra.getWorkflow('crucible')
      const run = await wf.createRun()
      // Fire and forget — SSE poll loop observes progress via DB
      run.start({ inputData: { sessionId, apiKey } }).catch(() => {})
    }

    let lastEntryCount = initial.transcriptEntries.length
    let lastState = initial.state
    let lastTerminal = initial.terminalState

    const body = new ReadableStream({
      async start(controller) {
        const emit = (data: Record<string, unknown>) => controller.enqueue(sseChunk(data))

        // Already terminal on connect (shouldn't normally reach here since the
        // hook skips isComplete sessions, but guard for safety)
        if (lastTerminal) {
          emit({ type: 'terminal', terminalState: lastTerminal })
          controller.close()
          return
        }

        const startTime = Date.now()
        let lastKeepalive = Date.now()

        while (true) {
          await sleep(POLL_INTERVAL_MS)

          if (Date.now() - startTime > MAX_DURATION_MS) {
            emit({ type: 'error', message: 'Deliberation timed out. Reload to check status.' })
            controller.close()
            return
          }

          if (Date.now() - lastKeepalive >= KEEPALIVE_INTERVAL_MS) {
            emit({ type: 'keepalive' })
            lastKeepalive = Date.now()
          }

          let fresh: Awaited<ReturnType<typeof getSessionWithTranscript>>
          try {
            fresh = await getSessionWithTranscript(sessionId)
          } catch {
            emit({ type: 'error', message: 'Database error. Reload to check status.' })
            controller.close()
            return
          }

          if (!fresh) {
            emit({ type: 'error', message: 'Session not found.' })
            controller.close()
            return
          }

          // Emit agent_completed BEFORE state_changed so the client appends the
          // message before the round indicator updates (avoids a one-frame flash
          // where the new round strip appears empty).
          if (fresh.transcriptEntries.length > lastEntryCount) {
            const newEntries = fresh.transcriptEntries.slice(lastEntryCount)
            for (const entry of newEntries) {
              emit({
                type: 'agent_completed',
                id: entry.id,
                agent: entry.agent,
                round: entry.round,
                content: entry.content
              })
            }
            lastEntryCount = fresh.transcriptEntries.length
          }

          if (fresh.state !== lastState) {
            lastState = fresh.state
            emit({ type: 'state_changed', state: fresh.state })
          }

          if (fresh.terminalState && fresh.terminalState !== lastTerminal) {
            lastTerminal = fresh.terminalState
            emit({ type: 'terminal', terminalState: fresh.terminalState })
            controller.close()
            return
          }
        }
      }
    })

    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  }

  // Fire and forget — caller polls session state via /api/sessions/[id]
  const wf = mastra.getWorkflow('crucible')
  const run = await wf.createRun()
  run.start({ inputData: { sessionId, apiKey } })
  return Response.json({ sessionId })
}
