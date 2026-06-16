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

export function parseMatchReport(text: string, candidateInfo: CandidateInfo): MatchReport | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
    const parsed = JSON.parse(cleaned)

    if (!parsed.grade || !parsed.recommendation || !parsed.signal) return null
    if (!Array.isArray(parsed.hard_requirements)) return null

    // Code-enforced NO FIT gate — model cannot override this
    const failedHardGate = parsed.hard_requirements.some(
      (r: { kind: string; met: boolean }) => r.kind === 'hard' && !r.met
    )
    const grade = failedHardGate ? 'NO FIT' : parsed.grade
    const recommendation = failedHardGate ? 'No Fit' : parsed.recommendation
    const confidence = grade === 'NO FIT' ? 'High' : grade === 'A' || grade === 'A-' ? 'High' : 'Moderate'

    return {
      candidate: candidateInfo,
      hard_requirements: parsed.hard_requirements,
      grade,
      recommendation,
      confidence,
      confidence_reasoning: parsed.confidence_reasoning ?? [],
      signal: parsed.signal ?? [],
      gaps: parsed.gaps ?? [],
      interview_hooks: parsed.interview_hooks ?? []
    }
  } catch {
    return null
  }
}
