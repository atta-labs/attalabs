// Corpus v2 — frozen 2026-04-21 for V2 experimentation.
// DO NOT MODIFY. V2 experiments require stable dataset for comparability.
// If new questions are needed for V2 expansion (Step 9), create corpus.v3.ts.
//
// V2 additions over V1:
// - v1_baseline_won: boolean | null — true for confirmed V1 losses, false for V1 wins,
//   null for questions not measured in the official V1 bench run (T2).
// - expected_vada_advantage: 'low' | 'medium' | 'high' — category-pattern prediction.
//
// V1 bench results (14 questions, 2026-04-21):
//   BASELINE_WON (7): T1, T3, T4, T5, B3, A1, A2
//   VADA_WON (7):     B2, E2, E3, P1, P2, P3, A3
//   T2: skipped in official V1 bench (smoke-test result exists but is not comparable —
//       different run conditions). v1_baseline_won: null. Participates in full-corpus
//       steps (1, 3, 9) but excluded from V1-loss subset steps (2, 4, 4.5, 5).
//
// expected_vada_advantage population rationale:
//   Technical (T1-T5): low   — V1 lost 0/5; analytical questions with clear answers
//   Ethical (E2, E3) + Personal (P1-P3): high — V1 won 5/5; multi-perspective value
//   Business (B2, B3) + Ambiguous (A1, A2, A3): medium — mixed V1 results

export type Category = 'Technical' | 'Business' | 'Ethical' | 'Personal' | 'Ambiguous'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type TerminalLikelihood = 'CLEAN' | 'REVISED'
export type VadaAdvantage = 'low' | 'medium' | 'high'

export interface BenchmarkQuestion {
  id: string
  text: string
  category: Category
  difficulty: Difficulty
  expected_terminal_likelihood: TerminalLikelihood
  // V2 stratification metadata
  v1_baseline_won: boolean | null
  expected_vada_advantage: VadaAdvantage
}

export const corpus: BenchmarkQuestion[] = [
  // ── Technical Architecture ────────────────────────────────────────────
  {
    id: 'T1',
    text: "We're a 3-person fintech team. Should we build on Vercel + Neon + Cloudflare Workers or a traditional AWS setup? We're optimizing for speed-to-market over cost.",
    category: 'Technical',
    difficulty: 'medium',
    expected_terminal_likelihood: 'CLEAN',
    v1_baseline_won: true,
    expected_vada_advantage: 'low'
  },
  {
    id: 'T2',
    // T2 was skipped in the official V1 bench run (resumability — question had a prior
    // smoke-test session). Smoke-test result: BASELINE_WON, but not comparable to the
    // controlled V1 bench conditions. v1_baseline_won is null: "not officially measured".
    // Participates in full-corpus steps (1, 3, 9). Excluded from V1-loss subset.
    text: 'Our Next.js codebase has four engineers who disagree: migrate to tRPC, stay with REST, or add GraphQL? The API is currently a mix of all three.',
    category: 'Technical',
    difficulty: 'easy',
    expected_terminal_likelihood: 'CLEAN',
    v1_baseline_won: null,
    expected_vada_advantage: 'low'
  },
  {
    id: 'T3',
    text: "We're hitting database bottlenecks at 500k DAU. Should we add Redis caching, add a read replica, or redesign the schema? We have 8 weeks and two engineers.",
    category: 'Technical',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: true,
    expected_vada_advantage: 'low'
  },
  {
    id: 'T4',
    text: "Our 4-person team needs to pick a CI system. Should we use GitHub Actions or CircleCI? We're already fully on GitHub.",
    category: 'Technical',
    difficulty: 'easy',
    expected_terminal_likelihood: 'CLEAN',
    v1_baseline_won: true,
    expected_vada_advantage: 'low'
  },
  {
    id: 'T5',
    text: "We're building a read-heavy analytics dashboard. Should we use PostgreSQL or MongoDB?",
    category: 'Technical',
    difficulty: 'easy',
    expected_terminal_likelihood: 'CLEAN',
    v1_baseline_won: true,
    expected_vada_advantage: 'low'
  },
  // ── Business Strategy ─────────────────────────────────────────────────
  {
    id: 'B2',
    text: 'Should we price our B2B dev tool at $49/month flat or usage-based? We have 30 beta users, mostly early-stage startups, and our main cost is LLM API calls.',
    category: 'Business',
    difficulty: 'medium',
    expected_terminal_likelihood: 'CLEAN',
    v1_baseline_won: false,
    expected_vada_advantage: 'medium'
  },
  {
    id: 'B3',
    text: 'A strategic acquirer just offered $8M for our company. We have $2M ARR growing 15% MoM and 18 months of runway. Do we sell?',
    category: 'Business',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: true,
    expected_vada_advantage: 'medium'
  },
  // ── Ethical / Values Dilemmas ─────────────────────────────────────────
  {
    id: 'E2',
    text: 'We discovered a data privacy bug that has been logging user messages unintentionally for 6 months. Our Series A closes in 3 weeks. When and how do we disclose?',
    category: 'Ethical',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: false,
    expected_vada_advantage: 'high'
  },
  {
    id: 'E3',
    text: 'Our hiring AI performs 12% worse for non-native English speakers. We have paying customers waiting to onboard. Do we ship now and fix later, or delay launch?',
    category: 'Ethical',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: false,
    expected_vada_advantage: 'high'
  },
  // ── Personal Life Decisions ───────────────────────────────────────────
  {
    id: 'P1',
    text: "I have 12 months of runway on my savings and a competitive contract job offer. The job pays well but would consume the time I'm using to build my own product. Do I accept or extend the runway?",
    category: 'Personal',
    difficulty: 'medium',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: false,
    expected_vada_advantage: 'high'
  },
  {
    id: 'P2',
    text: "I've been in a long-distance relationship for 2 years. My partner won't relocate. I just received a dream job offer in their city but I'm not excited about the role. What do I do?",
    category: 'Personal',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: false,
    expected_vada_advantage: 'high'
  },
  {
    id: 'P3',
    text: "I'm 35, hate my job, and want to start a company. I have a mortgage, two young kids, and $80k in savings. Is now the right time?",
    category: 'Personal',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: false,
    expected_vada_advantage: 'high'
  },
  // ── Ambiguous Framing ─────────────────────────────────────────────────
  {
    id: 'A1',
    text: 'Our engineering team of 10 has missed 3 of the last 4 quarterly deadlines despite working long hours. Management wants to add stricter estimation processes. What should we actually do?',
    category: 'Ambiguous',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: true,
    expected_vada_advantage: 'medium'
  },
  {
    id: 'A2',
    text: "We're not profitable yet. Should we cut costs or grow faster to reach profitability?",
    category: 'Ambiguous',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: true,
    expected_vada_advantage: 'medium'
  },
  {
    id: 'A3',
    text: 'Our product has great engagement metrics but almost no one converts to paid. Should we add a paywall?',
    category: 'Ambiguous',
    difficulty: 'medium',
    expected_terminal_likelihood: 'REVISED',
    v1_baseline_won: false,
    expected_vada_advantage: 'medium'
  }
]
