// PRODUCTION: Executes the full deliberation server-side via LangGraph.
//   ?stream=true  — SSE stream; browser consumes events as deliberation progresses
//   ?sync=true    — synchronous; bench harness waits for completion
//   (default)     — fire-and-forget; caller polls /api/sessions/[id]
//
// SECURITY: Provider keys are read from server-side encrypted store per request.
// Keys are never persisted beyond the request lifetime.
import 'server-only'
import { compileFlow, loadYamlFromCatalog } from '@atta/engine'
import type { ExecutionHooks, Plan } from '@atta/engine'
import { LangGraphAdapter, webSearchHandler } from '@atta/adapter-langgraph'
import type { ProviderKeys } from '@atta/adapter-langgraph'

/**
 * Handler map registered on the adapter for OpenAI-compat vendor tool loops.
 *
 * web_search: executes when a GPT/Grok/Groq agent declares `tools: [web_search]`
 * in YAML and the model emits a web_search tool_call. Resolution order:
 * Google CSE (GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX) → Tavily (TAVILY_API_KEY) → empty fallback.
 *
 * Google (Gemini) uses native googleSearch grounding — no handler required.
 * Anthropic uses server-side web_search_20260209 — no handler required.
 */
const VADA_TOOL_HANDLERS = {
  web_search: webSearchHandler
}
import { getCatalog, resolveVendorByPrefix, findModelEntryByModelId, getVendor, type VendorId } from '@atta/models'
import type { ReviewerConfig } from '@/lib/reviewer-models'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser, getSessionWithTranscript, setSessionTerminalState } from '@/db/queries'
import { persistTurn } from '@/engine/turn-logic'
import type { TurnPhase } from '@/engine/types'
import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'
import { db } from '@/db'

export const maxDuration = 300 // Hobby plan max (5 min)

const KEEPALIVE_INTERVAL_MS = 15_000
const MAX_DURATION_MS = 5 * 60 * 1_000
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
    if (node?.role !== 'audit' || (node.metadata.revisionIndex ?? 0) !== slotIndex) break
    result.push(node.agentName)
    current = edge.to
  }
  return result
}

// Compiles the plan, wires onNodeComplete → persistTurn, and awaits completion.
// Safe to call fire-and-forget (.catch()) or awaited.
async function runLangGraph(
  sessionId: string,
  apiKey: string | undefined,
  providerKeys?: ProviderKeys,
  reviewerConfig?: ReviewerConfig,
  agentVendorOverrides?: Record<string, VendorId>
): Promise<void> {
  const session = await getSessionWithTranscript(sessionId)
  if (!session) throw new Error(`Session ${sessionId} not found`)

  if (!session.specId) {
    throw new Error(`Session ${sessionId} has no specId; cannot resume deliberation.`)
  }
  const flow = loadYamlFromCatalog(session.specId)
  const plan = compileFlow(flow, session.question, session.modelId ?? 'claude-sonnet-4-6')

  const adapter = new LangGraphAdapter({
    apiKey,
    providerKeys: providerKeys && Object.keys(providerKeys).length > 0 ? providerKeys : undefined,
    reviewerConfig,
    agentVendorOverrides,
    customTools: VADA_TOOL_HANDLERS
  })

  const hooks: ExecutionHooks = {
    onNodeComplete: async ({ state, node, output }) => {
      if (node.role === 'solo') {
        // Brokered reviewer node — persist to transcript so it appears in the live SSE feed.
        // When the LLM call failed, store the error as visible content so the client
        // renders an error card rather than silently dropping the slot.
        await persistTurn(sessionId, {
          turnId: node.id,
          content: output.error ? `⚠ Reviewer error: ${output.error}` : output.content,
          phase: 'reviewer',
          agent: output.agentName,
          round: 1,
          tokensInput: output.tokensInput,
          tokensOutput: output.tokensOutput,
          elapsedMs: output.elapsedMs
        })
        return
      }

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
  } else {
    // For brokered (concatenate) flows, persistTurn never sets the terminal state because
    // there is no synthesis/audit node. Set it here when not already set by persistTurn.
    const fresh = await getSessionWithTranscript(sessionId)
    if (fresh && !fresh.terminalState) {
      await setSessionTerminalState(sessionId, 'CLEAN')
    }
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await getOrCreateUser(clerkId, '')
  const { id: sessionId } = await params

  // Ownership check — all workflow steps trust the sessionId passed via
  // getInitData(), so this is the single auth gate for the entire workflow run.
  const session = await getSessionForUser(sessionId, clerkId)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
  if (!masterKeyB64) return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  const masterKey = Buffer.from(masterKeyB64, 'base64')

  const apiKey: string | undefined = undefined
  let providerKeys: ProviderKeys | undefined
  const existing = await getProviderKeys(db, clerkId)
  if (existing) {
    const decrypted = decryptVendorKeys(
      existing.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
      clerkId,
      masterKey
    )
    if (Object.keys(decrypted).length > 0) {
      providerKeys = decrypted as ProviderKeys
    }
  }

  let reviewerConfig: ReviewerConfig | undefined
  try {
    const body = await req.json()
    if (body?.reviewerConfig && typeof body.reviewerConfig === 'object') {
      reviewerConfig = body.reviewerConfig as ReviewerConfig
    }
  } catch {
    // no body or non-JSON — fine
  }

  const url = new URL(req.url)
  const sync = url.searchParams.get('sync') === 'true'
  const stream = url.searchParams.get('stream') === 'true'

  // Build catalog-resolved vendor map: plan defaults first, reviewerConfig overrides on top.
  // Anthropic agents are excluded from the plan-defaults pass — the adapter falls back to
  // the env var (ANTHROPIC_API_KEY) for those, so BYOK key validation must not block them.
  // Catalog lookup is authoritative; prefix-based fallback handles models not in the catalog.
  let agentVendorOverrides: Record<string, VendorId> | undefined

  if (session.specId) {
    const catalog = await getCatalog()
    const flow = loadYamlFromCatalog(session.specId)
    const plan = compileFlow(flow, '', session.modelId ?? 'claude-sonnet-4-6')

    agentVendorOverrides = {}
    for (const [agentName, agent] of Object.entries(plan.agents)) {
      if (!agent.model) continue
      const entry = findModelEntryByModelId(catalog, agent.model)
      const vendorId = entry?.vendorId ?? resolveVendorByPrefix(agent.model)
      if (vendorId && vendorId !== 'anthropic') agentVendorOverrides[agentName] = vendorId
    }
    if (reviewerConfig && Object.keys(reviewerConfig).length > 0) {
      for (const [agentName, modelId] of Object.entries(reviewerConfig)) {
        const entry = findModelEntryByModelId(catalog, modelId)
        const vendorId = entry?.vendorId ?? resolveVendorByPrefix(modelId)
        if (vendorId) agentVendorOverrides[agentName] = vendorId
      }
    }
    if (Object.keys(agentVendorOverrides).length === 0) agentVendorOverrides = undefined

    // Pre-dispatch validation: verify all agents have provider keys before any LLM calls.
    for (const [agentName, agent] of Object.entries(plan.agents)) {
      const effectiveModel = reviewerConfig?.[agentName] ?? agent.model
      const vendor = agentVendorOverrides?.[agentName]
      if (!vendor) continue // anthropic-default or unresolvable
      if (getVendor(vendor).localOnly) continue // Ollama etc
      if (!providerKeys?.[vendor]) {
        return Response.json(
          { error: 'missing_provider_key', agent: agentName, model: effectiveModel, vendor },
          { status: 400 }
        )
      }
    }
  }

  if (sync) {
    await runLangGraph(sessionId, apiKey, providerKeys, reviewerConfig, agentVendorOverrides)
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
      runLangGraph(sessionId, apiKey, providerKeys, reviewerConfig, agentVendorOverrides).catch((err) =>
        console.error(`[LangGraph] Unhandled error for session ${sessionId}:`, err)
      )
    }

    const seenIds = new Set<string>(initial.transcriptEntries.map((e) => e.id))
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
          const newEntries = fresh.transcriptEntries.filter((e) => !seenIds.has(e.id))
          if (newEntries.length > 0) {
            for (const entry of newEntries) {
              seenIds.add(entry.id)
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
  runLangGraph(sessionId, apiKey, providerKeys, reviewerConfig, agentVendorOverrides).catch(() => {})
  return Response.json({ sessionId })
}
