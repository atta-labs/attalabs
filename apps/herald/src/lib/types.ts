export type MatchReport = {
  candidate: {
    name: string
    title: string
    github?: string
  }
  grade: 'A' | 'A-' | 'B+' | 'B'
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
    mitigation: string
  }[]
  interview_hooks: string[]
}
