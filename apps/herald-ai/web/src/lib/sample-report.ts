import type { MatchReport } from './types'

export const daniReport: MatchReport = {
  candidate: {
    name: 'Dani Estevez Martin',
    title: 'Senior Frontend Architect · AI Systems · Web3',
    github: 'daniboomerang'
  },

  hard_requirements: [
    {
      requirement: 'Frontend architecture experience',
      kind: 'hard',
      met: true,
      evidence: 'Multiple production Next.js apps with Turborepo monorepo structure'
    },
    {
      requirement: 'AI/LLM integration experience',
      kind: 'hard',
      met: true,
      evidence: 'MCP servers and LLM orchestration pipelines detected across repos'
    }
  ],

  grade: 'A-',
  recommendation: 'STRONG FIT',
  confidence: 'High',

  confidence_reasoning: [
    'Stack alignment confirmed via active Next.js + TypeScript production systems',
    'Evidence of multi-tenant architecture patterns (workspace isolation, shared infra)',
    'AI integration goes beyond API usage (MCP orchestration + streaming pipelines)'
  ],

  signal: [
    {
      title: 'Architectural Boundaries',
      observation: 'Detected: /apps + /packages workspace separation (Turborepo)',
      interpretation: 'Indicates system-level design capability and multi-product scalability',
      confidence: 'High Confidence'
    },
    {
      title: 'Defensive Data Contracts',
      observation: 'Observed: Zod schemas at API and form boundaries',
      interpretation: 'Shows senior-level handling of external data risk and runtime validation',
      confidence: 'High Confidence'
    },
    {
      title: 'UI Decoupling',
      observation: 'Confirmed: hooks/ vs components/ separation with headless UI primitives',
      interpretation: 'Demonstrates design-system thinking and separation of concerns',
      confidence: 'High Confidence'
    },
    {
      title: 'AI-Native Workflow',
      observation: 'Detected: MCP servers and LLM orchestration logic in active repos',
      interpretation: 'Indicates infrastructure-level AI usage, not surface-level tooling',
      confidence: 'Moderate Confidence'
    }
  ],

  gaps: [
    {
      gap: 'Limited recent Rust / Anchor exposure',
      severity: 'minor',
      mitigation: 'Seniority in C-style languages and Solidity suggests rapid ramp-up (estimated 1–2 weeks)'
    },
    {
      gap: 'Public OSS footprint smaller than enterprise experience',
      severity: 'minor',
      mitigation: 'Architecture patterns and system design signals compensate for lack of public scale indicators'
    }
  ],

  interview_hooks: [
    'Ask about: runtime theme isolation in multi-tenant Next.js architecture',
    'Ask about: tenant configuration boundaries in shared frontend infrastructure',
    'Ask about: security implications of BYOK architecture in AI systems'
  ]
}
