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
import { classifyVerdict, parseConclusionJson, parseConclusionLenient } from '@atta/orchestration'
import type { TurnErrorPayload, TurnPayload } from './types'

const TARGET_PATTERN = /\[TARGET:\s*([^\]]+)\]/i

function parseTarget(content: string): string | undefined {
  const match = TARGET_PATTERN.exec(content)
  return match?.[1]?.trim()
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

      const expectedCount = session.agents.length
      const newCount = await countRoundEntries(sessionId, userId, round)
      if (newCount >= expectedCount) {
        if (round === 1) await updateSessionState(sessionId, 'ROUND_2')
        else if (round === 2) await updateSessionState(sessionId, 'ROUND_3')
        else if (round === 3) {
          // Every deliberation ends with a conclusion pass — sparring alone is
          // not a product. All three team sizes (2, 4, 6 agents) are expected
          // to advance here; team size only affects how many entries fill the round.
          await updateSessionState(sessionId, 'CONCLUDING')
        }
      }
      return
    }

    case 'synthesize': {
      const strict = parseConclusionJson(payload.content)
      const lenient = strict ?? parseConclusionLenient(payload.content, session.agents)
      // Do NOT salvage raw output on parse failure — garbled JSON shown to
      // users erodes trust more than a clean ERROR state. Both strict (Zod)
      // and lenient (coerce known drift shapes) already run before this check.
      if (!lenient) {
        await deleteConclusionBySession(sessionId)
        await insertConclusion({
          sessionId,
          originalJson: {
            error: 'SYNTHESIS_FAILED_UNPARSEABLE',
            rawOutputLength: payload.content.length
          },
          criticVerdict: 'SYNTHESIS_FAILED_UNPARSEABLE',
          terminalState: 'ERROR'
        })
        await setSessionTerminalState(sessionId, 'ERROR')
        return
      }
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: lenient,
        criticVerdict: strict ? 'PENDING_AUDIT' : 'COERCED_FROM_LOOSE_JSON',
        terminalState: 'UNCONVERGED',
        reviewBy: lenient.review_by
      })
      await updateSessionState(sessionId, 'AUDITING')
      return
    }

    case 'audit': {
      const verdict = classifyVerdict(payload.content)
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
      if (!session.conclusion) return
      const strict = parseConclusionJson(payload.content)
      const lenient = strict ?? parseConclusionLenient(payload.content, session.agents)
      // Same containment rule as synthesize: never surface unparseable output.
      // The original conclusion is preserved so the Critic's verdict and prior
      // JSON remain intact for the error record.
      if (!lenient) {
        await deleteConclusionBySession(sessionId)
        await insertConclusion({
          sessionId,
          originalJson: session.conclusion.originalJson,
          criticVerdict: session.conclusion.criticVerdict,
          revisedJson: {
            error: 'REVISION_FAILED_UNPARSEABLE',
            rawOutputLength: payload.content.length
          },
          terminalState: 'ERROR'
        })
        await setSessionTerminalState(sessionId, 'ERROR')
        return
      }
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: session.conclusion.originalJson,
        criticVerdict: session.conclusion.criticVerdict,
        revisedJson: lenient,
        terminalState: 'UNCONVERGED',
        reviewBy: lenient.review_by
      })
      await updateSessionState(sessionId, 'AUDITING')
      return
    }

    case 'reaudit': {
      // REVISED is always terminal regardless of the Critic's re-verdict. The
      // verdict is stored as metadata (criticReVerdict) for human review, not
      // as a gate. A second revision loop would compound latency with
      // diminishing returns; we ship the revised conclusion and let the user
      // decide whether to re-run.
      const verdict = classifyVerdict(payload.content)
      if (!session.conclusion) return
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: session.conclusion.originalJson,
        criticVerdict: session.conclusion.criticVerdict,
        revisedJson: session.conclusion.revisedJson,
        criticReVerdict: verdict,
        terminalState: 'REVISED',
        reviewBy: (session.conclusion.revisedJson as { review_by?: string })?.review_by
      })
      await setSessionTerminalState(sessionId, 'REVISED')
      return
    }
  }
}

export async function recordTurnError(_sessionId: string, _userId: string, _payload: TurnErrorPayload): Promise<void> {
  // V1: no-op. State is unchanged, so /next will return the same command and
  // the browser can retry. Future: record a transient error flag to surface to UI.
}
