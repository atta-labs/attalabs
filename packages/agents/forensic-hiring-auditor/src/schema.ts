import { z } from 'zod'

export type HardRequirement = {
  requirement: string
  kind: 'hard' | 'soft'
  met: boolean
  evidence: string
}

export type MatchReport = {
  candidate: {
    name: string
    title: string
    github?: string
  }
  hard_requirements: HardRequirement[]
  grade: 'A' | 'A-' | 'B+' | 'B' | 'STRETCH' | 'NO FIT'
  recommendation: string
  confidence: string
  confidence_reasoning: string[]
  signal: {
    title: string
    observation: string
    interpretation: string
    confidence: string
  }[]
  gaps: {
    gap: string
    severity: 'disqualifying' | 'minor'
    mitigation: string | null
  }[]
  interview_hooks: string[]
  /** Present only when the audit execution itself failed (rate-limit, timeout,
   *  auth, or unknown) — the rest of the report's fields are placeholders when
   *  this is set. Absent on every real, graded report. */
  auditFailed?: {
    reason: string
    category: 'quota' | 'timeout' | 'auth' | 'unknown'
  }
  /** Total estimated USD cost across all LLM calls for this audit, when pricing is known. */
  estimatedCostUsd?: number
}

export const MatchReportSchema = z.object({
  candidate: z.object({
    name: z.string(),
    title: z.string(),
    github: z.string().optional()
  }),
  hard_requirements: z.array(
    z.object({
      requirement: z.string(),
      kind: z.enum(['hard', 'soft']),
      met: z.boolean(),
      evidence: z.string()
    })
  ),
  grade: z.enum(['A', 'A-', 'B+', 'B', 'STRETCH', 'NO FIT']),
  recommendation: z.string(),
  confidence: z.string(),
  confidence_reasoning: z.array(z.string()),
  signal: z.array(
    z.object({
      title: z.string(),
      observation: z.string(),
      interpretation: z.string(),
      confidence: z.string()
    })
  ),
  gaps: z.array(
    z.object({
      gap: z.string(),
      severity: z.enum(['disqualifying', 'minor']),
      mitigation: z.string().nullable()
    })
  ),
  interview_hooks: z.array(z.string()),
  auditFailed: z
    .object({
      reason: z.string(),
      category: z.enum(['quota', 'timeout', 'auth', 'unknown'])
    })
    .optional(),
  estimatedCostUsd: z.number().optional()
})
