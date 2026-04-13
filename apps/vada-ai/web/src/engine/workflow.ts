import { executeRoundOne } from './rounds/round-one'
import { executeSequentialRound } from './rounds/round-two'
import { generateConclusion } from './conclusion/synthesizer'
import { auditConclusion } from './conclusion/blind-critic'
import { reviseConclusion } from './conclusion/revision'
import {
  updateSessionState,
  setSessionTerminalState,
  insertConclusion,
  deleteConclusionBySession,
  getSessionWithTranscript
} from '../db/queries'
import { getAgentConfig, type AgentConfig } from '../schemas'
import type { SSEEmitter } from './stream'
import type { ModelConfig } from '../lib/models'

const SIMULATION_PAUSE = 2500

// Converts raw AI SDK errors into user-facing messages.
// Works for any provider — all return standard HTTP status codes.
function classifyLLMError(error: unknown): string {
  if (!(error instanceof Error)) return 'Deliberation failed. Please try again.'

  const statusCode = (error as { statusCode?: number }).statusCode
  const headers = (error as { responseHeaders?: Record<string, string> }).responseHeaders
  const retryAfter = headers?.['retry-after']

  if (statusCode === 429) {
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10)
      if (!Number.isNaN(seconds)) {
        const minutes = Math.ceil(seconds / 60)
        return `Rate limit reached. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
      }
    }
    return 'Rate limit reached. Please try again later.'
  }

  if (statusCode === 401 || statusCode === 403) {
    return 'Invalid API key. Please check your credentials.'
  }

  if (statusCode === 404) {
    return 'Model not found. Please check the model ID.'
  }

  return 'Deliberation failed. Please try again.'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Conclusion Protocol ──────────────────────────────────────────────────────

interface TranscriptEntry {
  agent: string
  content: string
  round: number
}

async function runConclusionProtocol(
  sessionId: string,
  question: string,
  agentRoles: string[],
  transcript: TranscriptEntry[],
  emitter: SSEEmitter,
  modelConfig?: ModelConfig
): Promise<void> {
  await updateSessionState(sessionId, 'CONCLUDING')
  emitter.emit({ type: 'state_change', state: 'CONCLUDING' })
  emitter.emit({ type: 'conclusion_start' })
  emitter.emit({ type: 'loading_state', message: 'Synthesizer is drafting the conclusion...' })

  const { conclusion: originalConclusion, raw: originalRaw } = await generateConclusion(
    question,
    transcript,
    agentRoles,
    modelConfig
  )

  if (!originalConclusion) {
    await insertConclusion({
      sessionId,
      originalJson: { raw: originalRaw, error: 'Schema validation failed' },
      criticVerdict: 'Schema validation failed',
      terminalState: 'UNCONVERGED'
    })
    await setSessionTerminalState(sessionId, 'UNCONVERGED')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
    return
  }

  await updateSessionState(sessionId, 'AUDITING')
  emitter.emit({ type: 'state_change', state: 'AUDITING' })
  emitter.emit({ type: 'loading_state', message: 'Blind Critic is reviewing the conclusion...' })

  const verdict = await auditConclusion(question, originalConclusion, modelConfig)

  if (verdict.startsWith('PASS')) {
    await insertConclusion({
      sessionId,
      originalJson: originalConclusion,
      criticVerdict: verdict,
      terminalState: 'CLEAN',
      reviewBy: originalConclusion.review_by
    })
    await setSessionTerminalState(sessionId, 'CLEAN')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'CLEAN' })
    await sleep(1000)
    return
  }

  await updateSessionState(sessionId, 'REVISING')
  emitter.emit({ type: 'state_change', state: 'REVISING' })
  emitter.emit({ type: 'loading_state', message: 'Synthesizer is revising...' })

  const { conclusion: revisedConclusion } = await reviseConclusion(originalConclusion, verdict, modelConfig)

  if (!revisedConclusion) {
    await insertConclusion({
      sessionId,
      originalJson: originalConclusion,
      criticVerdict: verdict,
      terminalState: 'UNCONVERGED'
    })
    await setSessionTerminalState(sessionId, 'UNCONVERGED')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
    await sleep(1000)
    return
  }

  emitter.emit({ type: 'loading_state', message: 'Blind Critic is reviewing revision...' })
  const reVerdict = await auditConclusion(question, revisedConclusion, modelConfig)

  if (reVerdict.startsWith('PASS')) {
    await insertConclusion({
      sessionId,
      originalJson: originalConclusion,
      criticVerdict: verdict,
      revisedJson: revisedConclusion,
      criticReVerdict: reVerdict,
      terminalState: 'REVISED',
      reviewBy: revisedConclusion.review_by
    })
    await setSessionTerminalState(sessionId, 'REVISED')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'REVISED' })
  } else {
    await setSessionTerminalState(sessionId, 'UNCONVERGED')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
  }

  await sleep(1000)
}

// ── Drive Workflow Loop ──────────────────────────────────────────────────────
// Re-reads session state from DB each iteration. Both runDeliberation (fresh)
// and resumeDeliberation (interrupted) converge here — one code path, no drift.

async function driveWorkflow(
  sessionId: string,
  emitter: SSEEmitter,
  modelConfig?: ModelConfig,
  perAgentModels?: Record<string, ModelConfig>
): Promise<void> {
  while (true) {
    const session = await getSessionWithTranscript(sessionId)
    if (!session || session.state === 'TERMINAL') return

    const agents: AgentConfig[] = session.agents.map((role) =>
      getAgentConfig(role as Parameters<typeof getAgentConfig>[0])
    )
    const synthesizer = agents.find((a) => a.role === 'synthesizer')
    const nonSynthesizer = agents.filter((a) => a.role !== 'synthesizer')
    const orderedAgents = synthesizer ? [...nonSynthesizer, synthesizer] : agents
    const entries = session.transcriptEntries.map((e) => ({
      agent: e.agent,
      content: e.content,
      round: e.round
    }))

    switch (session.state) {
      case 'ROUND_1': {
        emitter.emit({ type: 'state_change', state: 'ROUND_1' })
        const done = new Set(entries.filter((e) => e.round === 1).map((e) => e.agent))
        const remaining = agents.filter((a) => !done.has(a.name))
        await executeRoundOne(sessionId, session.question, remaining, emitter, modelConfig, perAgentModels)
        await sleep(SIMULATION_PAUSE)
        await updateSessionState(sessionId, 'ROUND_2')
        break
      }

      case 'ROUND_2': {
        emitter.emit({ type: 'state_change', state: 'ROUND_2' })
        const done = new Set(entries.filter((e) => e.round === 2).map((e) => e.agent))
        const remaining = orderedAgents.filter((a) => !done.has(a.name))
        await executeSequentialRound(
          sessionId,
          session.question,
          2,
          remaining,
          entries,
          emitter,
          modelConfig,
          perAgentModels
        )
        await sleep(SIMULATION_PAUSE)
        await updateSessionState(sessionId, 'ROUND_3')
        break
      }

      case 'ROUND_3': {
        emitter.emit({ type: 'state_change', state: 'ROUND_3' })
        const done = new Set(entries.filter((e) => e.round === 3).map((e) => e.agent))
        const remaining = orderedAgents.filter((a) => !done.has(a.name))
        await executeSequentialRound(
          sessionId,
          session.question,
          3,
          remaining,
          entries,
          emitter,
          modelConfig,
          perAgentModels
        )
        await sleep(SIMULATION_PAUSE)
        if (!synthesizer) {
          await setSessionTerminalState(sessionId, 'SPARRING_COMPLETE')
          emitter.emit({ type: 'conclusion_complete', terminal_state: 'SPARRING_COMPLETE' })
          await sleep(1000)
          return
        }
        await updateSessionState(sessionId, 'CONCLUDING')
        break
      }

      case 'CONCLUDING':
      case 'AUDITING':
      case 'REVISING': {
        await deleteConclusionBySession(sessionId)
        await runConclusionProtocol(sessionId, session.question, session.agents, entries, emitter, modelConfig)
        return
      }

      default:
        return
    }
  }
}

// ── Entry Points ─────────────────────────────────────────────────────────────

export async function runDeliberation(
  sessionId: string,
  _question: string,
  _agentRoles: string[],
  emitter: SSEEmitter,
  modelConfig?: ModelConfig,
  perAgentModels?: Record<string, ModelConfig>
): Promise<void> {
  try {
    await updateSessionState(sessionId, 'ROUND_1')
    await driveWorkflow(sessionId, emitter, modelConfig, perAgentModels)
  } catch (error) {
    const message = classifyLLMError(error)
    emitter.emit({ type: 'agent_error', agent: 'system', error: message })
  } finally {
    emitter.close()
  }
}

export async function resumeDeliberation(
  sessionId: string,
  emitter: SSEEmitter,
  modelConfig?: ModelConfig,
  perAgentModels?: Record<string, ModelConfig>
): Promise<void> {
  try {
    await driveWorkflow(sessionId, emitter, modelConfig, perAgentModels)
  } catch (error) {
    const message = classifyLLMError(error)
    emitter.emit({ type: 'agent_error', agent: 'system', error: message })
  } finally {
    emitter.close()
  }
}
