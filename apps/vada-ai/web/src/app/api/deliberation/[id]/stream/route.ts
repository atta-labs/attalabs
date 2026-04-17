import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'
import { SSEEmitter } from '@/engine/stream'
import { runDeliberation, resumeDeliberation } from '@/engine/workflow'
import {
  consumeEphemeralKey,
  consumeEphemeralProviderKey,
  peekEphemeralKey,
  peekEphemeralProviderKey
} from '@/engine/pending-keys'
import type { ModelConfig } from '@atta/models'

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
      } else if (session.terminalState === 'SPARRING_COMPLETE') {
        // Sparring sessions never insert a conclusion row
        emitter.emit({ type: 'conclusion_complete', terminal_state: 'SPARRING_COMPLETE' })
      }
      emitter.close()
    })()
    return emitter.toResponse()
  }

  // Build global ModelConfig from session + ephemeral key (if any)
  // Use consume for first start (PENDING), peek for resume so the key stays available
  const isPending = session.state === 'PENDING'
  const apiKey = isPending ? (consumeEphemeralKey(sessionId) ?? undefined) : (peekEphemeralKey(sessionId) ?? undefined)
  const modelConfig: ModelConfig | undefined = session.provider
    ? { provider: session.provider as ModelConfig['provider'], modelId: session.modelId ?? '', apiKey }
    : undefined

  // Build per-agent ModelConfig map from session.agentModels (if present)
  let perAgentModels: Record<string, ModelConfig> | undefined
  const rawAgentModels = session.agentModels as Record<string, { provider: string; modelId: string }> | null
  if (rawAgentModels) {
    perAgentModels = {}
    for (const [role, cfg] of Object.entries(rawAgentModels)) {
      const providerKey = isPending
        ? (consumeEphemeralProviderKey(sessionId, cfg.provider) ?? undefined)
        : (peekEphemeralProviderKey(sessionId, cfg.provider) ?? undefined)
      perAgentModels[role] = {
        provider: cfg.provider as ModelConfig['provider'],
        modelId: cfg.modelId,
        apiKey: providerKey
      }
    }
  }
  // Handle Live or Pending Sessions
  ;(async () => {
    // 1. First, replay what we already have in the DB
    await replayHistory()

    // 2. Resume or start the workflow based on session state
    if (session.state === 'PENDING') {
      runDeliberation(sessionId, session.question, session.agents, emitter, modelConfig, perAgentModels)
    } else {
      resumeDeliberation(sessionId, emitter, modelConfig, perAgentModels)
    }
  })()

  return emitter.toResponse()
}
