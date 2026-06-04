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
