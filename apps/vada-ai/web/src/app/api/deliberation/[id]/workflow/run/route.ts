// PRODUCTION: Executes the full deliberation server-side via LangGraph.
//   ?stream=true  — SSE stream; browser consumes events as deliberation progresses
//   ?sync=true    — synchronous; bench harness waits for completion
//   (default)     — fire-and-forget; caller polls /api/sessions/[id]
//
// SECURITY: apiKey transits server memory for the lifetime of this request only.
// It is never persisted.
import 'server-only'
import { compileSpec, loadYamlFromCatalog } from '@atta/engine'
import type { ExecutionHooks, Plan } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser, getSessionWithTranscript, setSessionTerminalState } from '@/db/queries'
import { persistTurn } from '@/engine/turn-logic'
import type { TurnPhase } from '@/engine/types'

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

// Returns audit agent names for a given revision slot in the order they execute.
// Traverses the plan's edge chain starting from terminal-<slotIndex>.
function resolveAuditChain(plan: Plan, slotIndex: number): string[] {
  const result: string[] = []
  let current = `terminal-${slotIndex}`
  while (true) {
    const edge = plan.graph.edges.find((e) => e.from === current)
    if (!edge) break
    const node = plan.graph.nodes[edge.to]
    if (!node || node.role !== 'audit' || (node.metadata.revisionIndex ?? 0) !== slotIndex) break
    result.push(node.agentName)
    current = edge.to
  }
  return result
}

// Compiles the plan, wires onNodeComplete → persistTurn, and awaits completion.
// Safe to call fire-and-forget (.catch()) or awaited.
async function runLangGraph(sessionId: string, apiKey: string | undefined): Promise<void> {
  const session = await getSessionWithTranscript(sessionId)
  if (!session) throw new Error(`Session ${sessionId} not found`)

  if (!session.specId) {
    throw new Error(`Session ${sessionId} has no specId; cannot resume deliberation.`)
  }
  const spec = loadYamlFromCatalog(session.specId)
  const plan = compileSpec(spec, session.question, session.modelId ?? 'claude-sonnet-4-6')

  const adapter = new LangGraphAdapter({ apiKey })

  const hooks: ExecutionHooks = {
    onNodeComplete: async ({ state, node, output }) => {
      if (node.role === 'round') {
        await persistTurn(sessionId, {
          turnId: node.id,
          content: output.content,
          phase: 'run_agent',
          agent: output.agentName,
          round: (node.metadata.roundIndex ?? 0) + 1,
          tokensInput: output.tokensInput,
          tokensOutput: output.tokensOutput,
          elapsedMs: output.elapsedMs
        })
        return
      }

      if (node.role === 'terminal') {
        const phase: TurnPhase = (node.metadata.revisionIndex ?? 0) === 0 ? 'synthesize' : 'revise'
        await persistTurn(sessionId, {
          turnId: node.id,
          content: output.content,
          phase,
          agent: output.agentName,
          structured: output.structured,
          tokensInput: output.tokensInput,
          tokensOutput: output.tokensOutput,
          elapsedMs: output.elapsedMs
        })
        return
      }

      if (node.role === 'audit') {
        const slotIndex = node.metadata.revisionIndex ?? 0
        // Only fire after ALL auditors in this slot have completed.
        // Uses the edge chain from terminal-<slotIndex> to determine which agents run in this slot.
        const auditChain = resolveAuditChain(plan, slotIndex)
        const auditNodesInSlot = auditChain.map((name) => `audit-${name}-${slotIndex}`)
        const allDone = auditNodesInSlot.every((id) => id in state.outputs)
        if (!allDone) return

        // Combined verdict: anyOf any auditor in this slot flagging triggers the phase.
        // Mirrors the engine's anyOf revisionCondition so the DB state reflects the actual
        // engine decision, not an individual auditor's verdict.
        const anyFlagged = auditChain.some((name) => {
          const o = state.outputs[`audit-${name}-${slotIndex}`]
          return o?.content.toLowerCase().includes('flag') ?? false
        })

        const phase: TurnPhase = slotIndex === 0 ? 'audit' : 'reaudit'
        await persistTurn(sessionId, {
          turnId: node.id,
          content: anyFlagged ? 'FLAG' : 'PASS',
          phase,
          tokensInput: output.tokensInput,
          tokensOutput: output.tokensOutput,
          elapsedMs: output.elapsedMs
        })
      }
    }
  }

  const conclusion = await adapter.execute({ plan, hooks, timeoutMs: 14 * 60 * 1_000 })

  if (conclusion.terminalState === 'FAILED') {
    console.error(`[LangGraph] Execution failed for session ${sessionId}:`, conclusion.error)
    const fresh = await getSessionWithTranscript(sessionId)
    if (fresh && !fresh.terminalState) {
      await setSessionTerminalState(sessionId, 'ERROR')
    }
  }
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
    await runLangGraph(sessionId, apiKey)
    const fresh = await getSessionWithTranscript(sessionId)
    return Response.json({
      state: fresh?.state ?? null,
      terminalState: fresh?.terminalState ?? null
    })
  }

  if (stream) {
    const initial = await getSessionWithTranscript(sessionId)
    if (!initial) return Response.json({ error: 'Session not found' }, { status: 404 })

    // Only start a new run when the session is PENDING. Reconnects
    // (page reload, browser back/forward) must not spawn a second run.
    const shouldStart = initial.state === 'PENDING'
    if (shouldStart) {
      runLangGraph(sessionId, apiKey).catch((err) =>
        console.error(`[LangGraph] Unhandled error for session ${sessionId}:`, err)
      )
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
              if (entry.structured !== null) {
                emit({
                  type: 'synthesis_complete',
                  agent: entry.agent,
                  content: entry.content,
                  structured: entry.structured,
                  is_revision: entry.orderInRound > 0
                })
              }
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
  runLangGraph(sessionId, apiKey).catch(() => {})
  return Response.json({ sessionId })
}
