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
  interview_hooks: z.array(z.string())
})
