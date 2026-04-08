import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'
import { SSEEmitter } from '@/engine/stream'
import { runDeliberation } from '@/engine/workflow'
import { consumeEphemeralKey } from '@/engine/pending-keys'
import type { ModelConfig } from '@/lib/models'

// Simulation delay to make "replayed" messages feel like they are arriving in real-time
const REPLAY_DELAY = 800

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id: sessionId } = await params
  const session = await getSessionWithTranscript(sessionId)

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  const emitter = new SSEEmitter()
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Internal function to replay history with a slight human-like delay
  const replayHistory = async () => {
    for (const entry of session.transcriptEntries) {
      emitter.emit({
        type: 'agent_complete',
        agent: entry.agent,
        round: entry.round,
        content: entry.content
      })
      // If we are replaying, add a small delay so the UI doesn't flicker/snap
      await sleep(REPLAY_DELAY)
    }
  }

  // Handle Terminal Sessions (Already finished)
  if (session.state === 'TERMINAL') {
    ;(async () => {
      await replayHistory()

      if (session.conclusion) {
        emitter.emit({
          type: 'conclusion_complete',
          terminal_state: session.conclusion.terminalState as 'CLEAN' | 'REVISED' | 'UNCONVERGED'
        })
      }
      emitter.close()
    })()
    return emitter.toResponse()
  }

  // Build ModelConfig from session + ephemeral key (if any)
  const apiKey = consumeEphemeralKey(sessionId) ?? undefined
  const modelConfig: ModelConfig | undefined = session.provider
    ? { provider: session.provider as ModelConfig['provider'], modelId: session.modelId ?? '', apiKey }
    : undefined

  // Handle Live or Pending Sessions
  ;(async () => {
    // 1. First, replay what we already have in the DB
    await replayHistory()

    // 2. If the session is new (PENDING), kick off the orchestrated workflow
    if (session.state === 'PENDING') {
      runDeliberation(sessionId, session.question, session.agents, emitter, modelConfig)
    } else {
      // If it's technically "IN_PROGRESS" but stalled, close to prevent hanging connections.
      emitter.close()
    }
  })()

  return emitter.toResponse()
}
