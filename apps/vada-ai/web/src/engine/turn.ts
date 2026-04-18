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

// Second-chance parse. Some providers (Gemini is the worst offender) return
// valid JSON that almost matches the schema but flattens `unresolved_points`
// into a string[] and omits `participants`. The deliberation already happened;
// dropping to salvage loses all the structure. Instead we coerce the known
// drift shapes and re-validate before giving up.
function parseConclusionLenient(raw: string, agents: string[]): Conclusion | null {
  try {
    const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>
    const patched: Record<string, unknown> = { ...parsed }

    if (Array.isArray(patched.unresolved_points)) {
      patched.unresolved_points = patched.unresolved_points.map((item) => {
        if (typeof item === 'string') return { point: item, agents_involved: [] }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          return {
            point:
              typeof obj.point === 'string'
                ? obj.point
                : typeof obj.text === 'string'
                  ? obj.text
                  : JSON.stringify(item),
            agents_involved: Array.isArray(obj.agents_involved)
              ? obj.agents_involved.filter((a): a is string => typeof a === 'string')
              : []
          }
        }
        return { point: String(item), agents_involved: [] }
      })
    }

    if (!Array.isArray(patched.participants)) {
      patched.participants = agents.map((a) => ({ agent: a, version: 'v1' }))
    }

    return ConclusionSchema.parse(patched)
  } catch {
    return null
  }
}

// Build a best-effort Conclusion from raw model output when schema parsing
// fails. The deliberation already happened — users should still see what the
// Synthesizer said, tagged with an honest note that it wasn't structured
// cleanly. Salvaged from pre-refactor engine/conclusion/synthesizer.ts, which
// had this fallback before the BYOK inversion.
function salvageConclusion(raw: string, agents: string[]): Conclusion {
  const trimmed = raw.trim()
  const reviewBy = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? ''
  return {
    recommendation: trimmed.slice(0, 2000) || 'The deliberation did not produce a structured recommendation.',
    key_condition: 'The model did not produce a structured key_condition. Raw synthesizer output shown above.',
    unresolved_points: agents.map((a) => ({
      point: 'Structured JSON parsing failed — raw output preserved in recommendation.',
      agents_involved: [a]
    })),
    review_by: reviewBy,
    participants: agents.map((a) => ({ agent: a, version: 'v1' }))
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
      // Strict → lenient → salvage. Lenient catches providers (Gemini) that
      // return valid JSON with unresolved_points as string[] and no
      // participants. Salvage only fires when the payload isn't even JSON.
      const strict = parseConclusionJson(payload.content)
      const lenient = strict ?? parseConclusionLenient(payload.content, session.agents)
      const conclusion = lenient ?? salvageConclusion(payload.content, session.agents)
      await deleteConclusionBySession(sessionId)
      await insertConclusion({
        sessionId,
        originalJson: conclusion,
        criticVerdict: strict ? 'PENDING_AUDIT' : lenient ? 'COERCED_FROM_LOOSE_JSON' : 'SALVAGED_FROM_RAW',
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
      if (!session.conclusion) return
      const strict = parseConclusionJson(payload.content)
      const lenient = strict ?? parseConclusionLenient(payload.content, session.agents)
      const revised = lenient ?? salvageConclusion(payload.content, session.agents)
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
