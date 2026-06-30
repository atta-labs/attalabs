// Core session-advancing logic for deliberation turns.
// No userId parameter — ownership is validated upstream (route handler or
// workflow trigger). Workflow steps call persistTurn() directly; the route
// handler adapter in turn.ts verifies ownership first, then delegates here.

import 'server-only'
import {
  bumpDeliberationMetrics,
  deleteConclusionBySession,
  getBenchmarkMetrics,
  getSessionWithTranscript,
  insertConclusion,
  insertTranscriptEntry,
  setSessionTerminalState,
  updateSessionState
} from '@/db/queries'
import { classifyVerdict, parseConclusionJson, parseConclusionLenient } from '@/schemas/conclusion'
import type { TurnPayload } from './types'

const TARGET_PATTERN = /\[TARGET:\s*([^\]]+)\]/i

function parseTarget(content: string): string | undefined {
  const match = TARGET_PATTERN.exec(content)
  return match?.[1]?.trim()
}

async function countRoundEntries(sessionId: string, round: number): Promise<number> {
  const fresh = await getSessionWithTranscript(sessionId)
  if (!fresh) return 0
  return fresh.transcriptEntries.filter((e) => e.round === round).length
}

/**
 * Persists a deliberation turn to the DB.
 *
 * CONTRACT: Callers MUST verify session ownership before invoking this function.
 * persistTurn has no auth surface — it trusts the sessionId is valid for the
 * calling context. Current callers:
 *   - recordTurn (apps/vada-ai/web/src/engine/turn.ts) — verifies via getSessionForUser
 *   - Future: Mastra workflow steps invoked from /workflow/run — verified at route entry
 *
 * Do NOT call persistTurn from a context that has not validated session ownership.
 */
export async function persistTurn(sessionId: string, payload: TurnPayload): Promise<void> {
  const session = await getSessionWithTranscript(sessionId)
  if (!session) return

  if (payload.elapsedMs !== undefined) {
    const metrics = await getBenchmarkMetrics(sessionId)
    if (metrics) {
      await bumpDeliberationMetrics(sessionId, {
        tokensInput: payload.tokensInput ?? null,
        tokensOutput: payload.tokensOutput ?? null,
        elapsedMs: payload.elapsedMs
      })
    }
  }

  switch (payload.phase) {
    case 'reviewer': {
      // Brokered reviewer turn — insert transcript entry, no session state advancement.
      // Reviewers run sequentially inside a brokered plan; their outputs appear in
      // the live SSE feed via the agent_completed event.
      const round = payload.round ?? 1
      const agent = payload.agent ?? 'unknown'
      const entriesInRound = session.transcriptEntries.filter((e) => e.round === round).length
      await insertTranscriptEntry({
        sessionId,
        round,
        agent,
        content: payload.content,
        orderInRound: entriesInRound
      })
      return
    }

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
      const newCount = await countRoundEntries(sessionId, round)
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
      // Pre-validated structured output from the adapter (spec declared output_schema).
      // Handles non-debate conclusion shapes (e.g. battlefield-map) where debate-schema
      // Zod validation would reject perfectly valid output. The adapter already
      // validated against the spec's output_schema when it extracted the tool input.
      const fromStructured =
        !lenient &&
        payload.structured &&
        typeof payload.structured === 'object' &&
        Object.keys(payload.structured as object).length > 0
          ? (payload.structured as Record<string, unknown>)
          : null
      const conclusionData = lenient ?? fromStructured
      // Do NOT salvage raw output on parse failure — garbled JSON shown to
      // users erodes trust more than a clean ERROR state. Both strict (Zod)
      // and lenient (coerce known drift shapes) already run before this check.
      if (!conclusionData) {
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
        originalJson: conclusionData,
        criticVerdict: strict ? 'PENDING_AUDIT' : 'COERCED_FROM_LOOSE_JSON',
        terminalState: 'UNCONVERGED',
        reviewBy: (conclusionData as { review_by?: string }).review_by
      })
      const synthOrderInRound = session.transcriptEntries.filter((e) => e.round === 0).length
      await insertTranscriptEntry({
        sessionId,
        round: 0,
        agent: payload.agent ?? 'synthesizer',
        content: payload.content,
        orderInRound: synthOrderInRound,
        ...(payload.structured !== undefined ? { structured: payload.structured } : {})
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
      // Same structured-output fallback as synthesize — non-debate schemas need this too.
      const fromStructured =
        !lenient &&
        payload.structured &&
        typeof payload.structured === 'object' &&
        Object.keys(payload.structured as object).length > 0
          ? (payload.structured as Record<string, unknown>)
          : null
      const conclusionData = lenient ?? fromStructured
      // Same containment rule as synthesize: never surface unparseable output.
      // The original conclusion is preserved so the Critic's verdict and prior
      // JSON remain intact for the error record.
      if (!conclusionData) {
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
        revisedJson: conclusionData,
        terminalState: 'UNCONVERGED',
        reviewBy: (conclusionData as { review_by?: string }).review_by
      })
      const reviseOrderInRound = session.transcriptEntries.filter((e) => e.round === 0).length
      await insertTranscriptEntry({
        sessionId,
        round: 0,
        agent: payload.agent ?? 'synthesizer',
        content: payload.content,
        orderInRound: reviseOrderInRound,
        ...(payload.structured !== undefined ? { structured: payload.structured } : {})
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
