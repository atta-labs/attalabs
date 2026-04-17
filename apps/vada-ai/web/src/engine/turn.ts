// Persists browser-reported turn results and advances session state.
// Never receives provider API keys (the browser calls providers directly;
// see /trust).

import 'server-only'
import {
  deleteConclusionBySession,
  getSessionWithTranscriptForUser,
  insertConclusion,
  insertTranscriptEntry,
  setSessionTerminalState,
  updateSessionState
} from '@/db/queries'
import { type Conclusion, ConclusionSchema } from '@/schemas'
import type { TurnErrorPayload, TurnPayload } from './types'

const TARGET_PATTERN = /\[TARGET:\s*([^\]]+)\]/i

function parseTarget(content: string): string | undefined {
  const match = TARGET_PATTERN.exec(content)
  return match?.[1]?.trim()
}

function extractJson(raw: string): string {
  const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw) ?? /(\{[\s\S]*\})/i.exec(raw)
  return jsonMatch?.[1]?.trim() ?? raw.trim()
}

function parseConclusionJson(raw: string): Conclusion | null {
  try {
    const parsed: unknown = JSON.parse(extractJson(raw))
    return ConclusionSchema.parse(parsed)
  } catch {
    return null
  }
}

function classifyVerdict(raw: string): 'PASS' | string {
  const trimmed = raw.trim()
  const upper = trimmed.toUpperCase()
  if (upper.includes('PASS') && !upper.includes('FLAG')) return 'PASS'
  return trimmed
}

async function countRoundEntries(sessionId: string, userId: string, round: number): Promise<number> {
  const fresh = await getSessionWithTranscriptForUser(sessionId, userId)
  if (!fresh) return 0
  return fresh.transcriptEntries.filter((e) => e.round === round).length
}

export async function recordTurn(sessionId: string, userId: string, payload: TurnPayload): Promise<void> {
  const session = await getSessionWithTranscriptForUser(sessionId, userId)
  if (!session) return

  switch (payload.phase) {
    case 'run_agent': {
      const round = payload.round ?? 0
      const agent = payload.agent ?? 'unknown'
      const entriesInRound = session.transcriptEntries.filter((e) => e.round === round).length
      const target = parseTarget(payload.content)
      await insertTranscriptEntry({
        sessionId,
        round,
        agent,
        content: payload.content,
        ...(target ? { target } : {}),
        orderInRound: entriesInRound
      })

      // Advance state machine if this round is now complete
      const expectedCount = session.agents.length
      const newCount = await countRoundEntries(sessionId, userId, round)
      if (newCount >= expectedCount) {
        if (round === 1) await updateSessionState(sessionId, 'ROUND_2')
        else if (round === 2) await updateSessionState(sessionId, 'ROUND_3')
        else if (round === 3) {
          const hasSynth = session.agents.includes('synthesizer')
          if (hasSynth) await updateSessionState(sessionId, 'CONCLUDING')
          else {
            await setSessionTerminalState(sessionId, 'SPARRING_COMPLETE')
          }
        }
      }
      return
    }

    case 'synthesize': {
      const conclusion = parseConclusionJson(payload.content)
      await deleteConclusionBySession(sessionId)
      if (!conclusion) {
        await insertConclusion({
          sessionId,
          originalJson: { raw: payload.content, error: 'Schema validation failed' },
          criticVerdict: 'Schema validation failed',
          terminalState: 'UNCONVERGED'
        })
        await setSessionTerminalState(sessionId, 'UNCONVERGED')
        return
      }
      await insertConclusion({
        sessionId,
        originalJson: conclusion,
        criticVerdict: 'PENDING_AUDIT',
        terminalState: 'UNCONVERGED',
        reviewBy: conclusion.review_by
      })
      await updateSessionState(sessionId, 'AUDITING')
      return
    }

    case 'audit': {
      const verdict = classifyVerdict(payload.content)
      // Update the conclusion row with the verdict
      if (!session.conclusion) return
      const isPass = verdict === 'PASS'
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: session.conclusion.originalJson,
        criticVerdict: verdict,
        terminalState: isPass ? 'CLEAN' : 'UNCONVERGED',
        reviewBy: (session.conclusion.originalJson as { review_by?: string })?.review_by
      })
      if (isPass) {
        await setSessionTerminalState(sessionId, 'CLEAN')
      } else {
        await updateSessionState(sessionId, 'REVISING')
      }
      return
    }

    case 'revise': {
      const revised = parseConclusionJson(payload.content)
      if (!session.conclusion) return
      if (!revised) {
        await setSessionTerminalState(sessionId, 'UNCONVERGED')
        return
      }
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: session.conclusion.originalJson,
        criticVerdict: session.conclusion.criticVerdict,
        revisedJson: revised,
        terminalState: 'UNCONVERGED',
        reviewBy: revised.review_by
      })
      await updateSessionState(sessionId, 'AUDITING')
      return
    }

    case 'reaudit': {
      const verdict = classifyVerdict(payload.content)
      if (!session.conclusion) return
      const isPass = verdict === 'PASS'
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: session.conclusion.originalJson,
        criticVerdict: session.conclusion.criticVerdict,
        revisedJson: session.conclusion.revisedJson,
        criticReVerdict: verdict,
        terminalState: isPass ? 'REVISED' : 'UNCONVERGED',
        reviewBy: (session.conclusion.revisedJson as { review_by?: string })?.review_by
      })
      await setSessionTerminalState(sessionId, isPass ? 'REVISED' : 'UNCONVERGED')
      return
    }
  }
}

export async function recordTurnError(_sessionId: string, _userId: string, _payload: TurnErrorPayload): Promise<void> {
  // V1: no-op. State is unchanged, so /next will return the same command and
  // the browser can retry. Future: record a transient error flag to surface to UI.
}
