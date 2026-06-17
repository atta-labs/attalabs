// Parses the JSON match-report payload produced by the Skeptical Auditor.
// Pure: takes the model's raw `content` string + the canonical candidate info,
// returns a typed MatchReport or null. The NO-FIT hard-requirement gate is
// enforced here in code — the model cannot override it.
//
// Extracted from app/api/audit/route.ts so the parser can be unit-tested in
// isolation (the route file cannot be imported under bun:test today because
// it pulls in `next/server`).

import type { MatchReport } from './types'

export interface CandidateInfo {
  name: string
  title: string
  github: string
}

export interface ParseMatchReportOptions {
  /** Optional logger called once on parse failure with a short diagnostic. */
  onParseFailure?: (info: { reason: string; head: string; tail: string }) => void
}

// Strip a leading ```json fence and a trailing ``` fence (the most common
// shape models emit when they wrap the JSON).
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
}

// Fallback for when the model emits prose before or after the JSON object
// (e.g. "Here is the report:" or trailing markdown), which JSON.parse rejects.
// Slice from the first `{` to the matching balanced `}`, ignoring braces
// inside string literals. Returns null if no balanced object exists.
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let isEscape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (isEscape) {
      isEscape = false
      continue
    }
    if (ch === '\\' && inString) {
      isEscape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function buildReport(parsed: unknown, candidateInfo: CandidateInfo): MatchReport | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>
  if (!p.grade || !p.recommendation || !p.signal) return null
  if (!Array.isArray(p.hard_requirements)) return null

  // Code-enforced NO FIT gate — model cannot override this
  const failedHardGate = (p.hard_requirements as Array<{ kind?: string; met?: boolean }>).some(
    (r) => r.kind === 'hard' && !r.met
  )
  const grade = failedHardGate ? 'NO FIT' : (p.grade as MatchReport['grade'])
  const recommendation = failedHardGate ? 'No Fit' : (p.recommendation as string)
  const confidence = grade === 'NO FIT' ? 'High' : grade === 'A' || grade === 'A-' ? 'High' : 'Moderate'

  return {
    candidate: candidateInfo,
    hard_requirements: p.hard_requirements as MatchReport['hard_requirements'],
    grade,
    recommendation,
    confidence,
    confidence_reasoning: (p.confidence_reasoning as string[] | undefined) ?? [],
    signal: (p.signal as MatchReport['signal'] | undefined) ?? [],
    gaps: (p.gaps as MatchReport['gaps'] | undefined) ?? [],
    interview_hooks: (p.interview_hooks as string[] | undefined) ?? []
  }
}

export function parseMatchReport(
  text: string,
  candidateInfo: CandidateInfo,
  opts: ParseMatchReportOptions = {}
): MatchReport | null {
  // Attempt 1: strip markdown fences, parse the whole text.
  const cleaned = stripFences(text)
  try {
    const parsed = JSON.parse(cleaned)
    const report = buildReport(parsed, candidateInfo)
    if (report) return report
    opts.onParseFailure?.({
      reason: 'shape-mismatch (required fields missing on stripFences path)',
      head: text.slice(0, 300),
      tail: text.slice(-200)
    })
    return null
  } catch {
    // Fall through to the prose-tolerant fallback.
  }

  // Attempt 2: pull the first balanced {...} object and parse it. Handles the
  // case where the model emits prose before or after the JSON (e.g. "Here is
  // the JSON:\n{ ... }\n" or trailing commentary the system prompt forbids
  // but models occasionally produce anyway).
  const sliced = extractFirstJsonObject(cleaned)
  if (sliced) {
    try {
      const parsed = JSON.parse(sliced)
      const report = buildReport(parsed, candidateInfo)
      if (report) return report
      opts.onParseFailure?.({
        reason: 'shape-mismatch (required fields missing on balanced-slice path)',
        head: text.slice(0, 300),
        tail: text.slice(-200)
      })
      return null
    } catch (err) {
      opts.onParseFailure?.({
        reason: `JSON.parse threw on balanced slice: ${err instanceof Error ? err.message : String(err)}`,
        head: text.slice(0, 300),
        tail: text.slice(-200)
      })
      return null
    }
  }

  opts.onParseFailure?.({
    reason: 'no balanced JSON object found in response',
    head: text.slice(0, 300),
    tail: text.slice(-200)
  })
  return null
}
