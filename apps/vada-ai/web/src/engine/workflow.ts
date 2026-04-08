import { executeRoundOne } from './rounds/round-one'
import { executeSequentialRound } from './rounds/round-two'
import { generateConclusion } from './conclusion/synthesizer'
import { auditConclusion } from './conclusion/blind-critic'
import { reviseConclusion } from './conclusion/revision'
import { updateSessionState, setSessionTerminalState, insertConclusion, getSessionWithTranscript } from '../db/queries'
import { getAgentConfig, type AgentConfig } from '../schemas'
import type { SSEEmitter } from './stream'

const SIMULATION_PAUSE = 2500

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function runDeliberation(
  sessionId: string,
  question: string,
  agentRoles: string[],
  emitter: SSEEmitter
): Promise<void> {
  const agents: AgentConfig[] = agentRoles.map((role) => getAgentConfig(role as Parameters<typeof getAgentConfig>[0]))

  const synthesizer = agents.find((a) => a.role === 'synthesizer')
  const nonSynthesizer = agents.filter((a) => a.role !== 'synthesizer')
  const orderedAgents = synthesizer ? [...nonSynthesizer, synthesizer] : agents

  try {
    // --- Round 1: Parallel ---
    await updateSessionState(sessionId, 'ROUND_1')
    emitter.emit({ type: 'state_change', state: 'ROUND_1' })
    await executeRoundOne(sessionId, question, agents, emitter)

    await sleep(SIMULATION_PAUSE)

    const afterR1 = await getSessionWithTranscript(sessionId)
    const r1Entries = (afterR1?.transcriptEntries ?? []).map((e) => ({
      agent: e.agent,
      content: e.content,
      round: e.round
    }))

    // --- Round 2: Sequential ---
    await updateSessionState(sessionId, 'ROUND_2')
    emitter.emit({ type: 'state_change', state: 'ROUND_2' })
    await executeSequentialRound(sessionId, question, 2, orderedAgents, r1Entries, emitter)

    await sleep(SIMULATION_PAUSE)

    const afterR2 = await getSessionWithTranscript(sessionId)
    const allEntriesAfterR2 = (afterR2?.transcriptEntries ?? []).map((e) => ({
      agent: e.agent,
      content: e.content,
      round: e.round
    }))

    // --- Round 3: Sequential ---
    await updateSessionState(sessionId, 'ROUND_3')
    emitter.emit({ type: 'state_change', state: 'ROUND_3' })
    await executeSequentialRound(sessionId, question, 3, orderedAgents, allEntriesAfterR2, emitter)

    await sleep(SIMULATION_PAUSE)

    const afterR3 = await getSessionWithTranscript(sessionId)
    const completeTranscript = (afterR3?.transcriptEntries ?? []).map((e) => ({
      agent: e.agent,
      content: e.content,
      round: e.round
    }))

    // --- Conclusion Protocol ---
    await updateSessionState(sessionId, 'CONCLUDING')
    emitter.emit({ type: 'state_change', state: 'CONCLUDING' })
    emitter.emit({ type: 'conclusion_start' })
    emitter.emit({ type: 'loading_state', message: 'Synthesizer is drafting the conclusion...' })

    const { conclusion: originalConclusion, raw: originalRaw } = await generateConclusion(
      question,
      completeTranscript,
      agentRoles
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

    // --- Blind Critic Audit ---
    await updateSessionState(sessionId, 'AUDITING')
    emitter.emit({ type: 'state_change', state: 'AUDITING' })
    emitter.emit({ type: 'loading_state', message: 'Blind Critic is reviewing the conclusion...' })

    const verdict = await auditConclusion(question, originalConclusion)

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
      await sleep(1000) // FINAL FIX: Give SSE time to flush the last event
      return
    }

    // --- Revision ---
    await updateSessionState(sessionId, 'REVISING')
    emitter.emit({ type: 'state_change', state: 'REVISING' })
    emitter.emit({ type: 'loading_state', message: 'Synthesizer is revising...' })

    const { conclusion: revisedConclusion } = await reviseConclusion(originalConclusion, verdict)

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
    const reVerdict = await auditConclusion(question, revisedConclusion)

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

    await sleep(1000) // FINAL FIX: Give SSE time to flush the last event
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow error'
    emitter.emit({ type: 'agent_error', agent: 'system', error: message })
    await setSessionTerminalState(sessionId, 'UNCONVERGED')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
    await sleep(1000)
  } finally {
    emitter.close()
  }
}
