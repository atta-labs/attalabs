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

// Best-effort repair of common JSON mistakes produced by smaller models.
// Not a full parser — just targeted regex fixes for the shapes we've seen
// in real deliberation outputs.
function repairJson(s: string): string {
  let out = s
  // Missing comma between a string value and the next key:
  //   "foo": "bar" "baz": "qux"  →  "foo": "bar", "baz": "qux"
  out = out.replace(/([^\\])"(\s+)"([A-Za-z_][A-Za-z0-9_]*)"(\s*):/g, '$1", "$3"$4:')
  // Trailing comma before } or ]
  out = out.replace(/,(\s*[}\]])/g, '$1')
  return out
}

// Close truncated JSON. Small models under max_tokens emit `{ "recommendation":
// "...long string...` and just stop mid-value. Walk the string tracking string
// vs structural context, then append whatever closers are still open.
// Returns the balanced string, or null if structurally invalid (unmatched
// closers we can't recover from).
function closeTruncatedJson(s: string): string | null {
  let inString = false
  let escaped = false
  let braces = 0
  let brackets = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (c === '\\') {
      escaped = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === '{') braces++
    else if (c === '}') braces--
    else if (c === '[') brackets++
    else if (c === ']') brackets--
    if (braces < 0 || brackets < 0) return null
  }
  let out = s
  // If we ended mid-string, close it. Also trim a trailing backslash that
  // would escape our closing quote.
  if (inString) {
    if (out.endsWith('\\')) out = out.slice(0, -1)
    // Trim a trailing lone ',' or ':' that would make the post-close syntax
    // invalid (e.g. `"foo": "bar\nbaz` → closing gives `"baz"` at end; but
    // if the value ended with a colon followed by nothing, the repair still
    // produces junk — the parent object-close below then adds `}` which
    // JSON.parse will reject anyway, surfaces naturally as failure).
    out += '"'
  }
  // Drop dangling `,` that would sit between the last-closed value and the
  // appended `}` or `]`.
  out = out.replace(/,\s*$/, '')
  while (brackets > 0) {
    out += ']'
    brackets--
  }
  while (braces > 0) {
    out += '}'
    braces--
  }
  return out
}

// Extract a JSON object from a model response that may be wrapped in code
// fences, prefixed with prose, contain nested ``` blocks inside string
// values, or have small syntax mistakes (missing commas, trailing commas).
//
// Strategy: try several candidate slices, with and without repair, and
// return the first one that parses. Falls back to trimmed raw — JSON.parse
// downstream will then throw and salvage takes over.
function extractJson(raw: string): string {
  const trimmed = raw.trim()
  const slices: string[] = []

  // 1. Outer single ```json ... ``` wrapper around the entire response.
  const outer = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(trimmed)
  if (outer?.[1]) slices.push(outer[1].trim())

  // 2. First `{` to last `}` — robust against prose before/after the JSON.
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first !== -1 && last > first) slices.push(trimmed.slice(first, last + 1))

  // 3. Raw as-is (model returned naked JSON with no wrapper).
  slices.push(trimmed)

  // Try each slice four ways, in order of increasing aggression:
  //   1. as-is
  //   2. repairJson (missing commas, trailing commas)
  //   3. closeTruncatedJson (append missing `"` `]` `}` when output was cut
  //      off before the synthesizer finished)
  //   4. closeTruncatedJson + repairJson (both repairs chained)
  const attempts: Array<(s: string) => string | null> = [
    (x) => x,
    (x) => repairJson(x),
    (x) => closeTruncatedJson(x),
    (x) => {
      const closed = closeTruncatedJson(x)
      return closed ? repairJson(closed) : null
    }
  ]
  for (const s of slices) {
    for (const attempt of attempts) {
      const candidate = attempt(s)
      if (candidate == null) continue
      try {
        JSON.parse(candidate)
        return candidate
      } catch {
        // next attempt
      }
    }
  }
  return trimmed
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
          // Model drift observed in the wild: `{ agents, disagreement }`,
          // `{ agents, disement }` (typo), `{ description }`, etc. Try each
          // likely text field before giving up and stringifying the object.
          // Try every text-ish key the models have produced in the wild.
          // Order matters only when multiple are present — prefer the most
          // specific first. `point_of_disagreement` is Qwen's favorite.
          const textKeys = [
            'point',
            'point_of_disagreement',
            'pointOfDisagreement',
            'disagreement',
            'disement',
            'description',
            'statement',
            'summary',
            'issue',
            'text'
          ]
          let point: string | null = null
          for (const k of textKeys) {
            const v = obj[k]
            if (typeof v === 'string' && v.trim().length > 0) {
              point = v
              break
            }
          }
          // Typo-tolerant fallback: if no recognized key matched, pick the
          // longest non-empty string value in the object. Catches model
          // typos like `poof_disagreement` or novel keys like `conflict`.
          if (!point) {
            let longest = ''
            for (const k of Object.keys(obj)) {
              const v = obj[k]
              if (typeof v === 'string' && v.trim().length > longest.length) longest = v
            }
            if (longest) point = longest
          }
          if (!point) point = JSON.stringify(item)
          const agentsInvolved = Array.isArray(obj.agents_involved)
            ? obj.agents_involved.filter((a): a is string => typeof a === 'string')
            : Array.isArray(obj.agents)
              ? obj.agents.filter((a): a is string => typeof a === 'string')
              : []
          return { point, agents_involved: agentsInvolved }
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
          // Every deliberation ends with a conclusion, regardless of team
          // composition. The Synthesizer role is run even when no agent in
          // the team has that role — the orchestrator falls back to the
          // session's default model for the synthesis + audit passes.
          await updateSessionState(sessionId, 'CONCLUDING')
        }
      }
      return
    }

    case 'synthesize': {
      // Strict → lenient. If both fail, we used to fall back to salvage,
      // which wrapped the raw model output as `recommendation`. That meant
      // truncated JSON, double-encoded escape sequences, and hallucinated
      // code blocks ended up rendered to the user as "the team's answer."
      // Containment rule: when the model's output can't be parsed at all,
      // terminate the session as ERROR. Never surface raw text as a
      // recommendation. See specs/v2/pipeline-containment.md.
      const strict = parseConclusionJson(payload.content)
      const lenient = strict ?? parseConclusionLenient(payload.content, session.agents)
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
      // Same containment rule as synthesize — if the revision pass can't
      // produce parseable JSON, terminate as ERROR rather than letting
      // salvage dump raw output into `revisedJson.recommendation`.
      if (!session.conclusion) return
      const strict = parseConclusionJson(payload.content)
      const lenient = strict ?? parseConclusionLenient(payload.content, session.agents)
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
      // Vāda always delivers a team answer. Even when the Critic's re-audit
      // flags a residual concern, the Synthesizer's revised conclusion is the
      // team's agreement and ships as REVISED. The critic's verdict is kept
      // as caveat metadata (criticReVerdict) so the UI can surface the
      // reservation without hiding the conclusion.
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
