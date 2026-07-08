export const MAX_STACK_TAGS = 20

export interface CandidateProfile {
  name: string
  title: string
  location?: string
  availability?: string
  summary: string
  stack: string[]
  projects: Array<{
    title: string
    description: string
  }>
  experience: Array<{
    company: string
    role: string
    period: string
    highlights: string[]
  }>
}

export interface MatchReport {
  candidate: {
    name: string
    title: string
    github?: string
  }
  grade: 'A' | 'A-' | 'B+' | 'B'
  recommendation: string
  confidence: string
  confidence_reasoning: string[]
  signal: Array<{
    title: string
    observation: string
    interpretation: string
    confidence: string
  }>
  gaps: Array<{
    gap: string
    mitigation: string
  }>
  interview_hooks: string[]
}
