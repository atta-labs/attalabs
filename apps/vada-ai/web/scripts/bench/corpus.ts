// Bench question corpus — intentionally biased toward questions where
// deliberation adds value. This means more REVISED than CLEAN predictions.
//
// Distribution rationale:
// - Technical: 5 questions (over-sampled vs other categories to give
//   solid floor-case anchors — T4/T5 are intentional easy-CLEAN baselines)
// - Business: 2 (B1 retired, too generic; B2/B3 sharper)
// - Ethical: 2 (E1 retired, too clear-cut; E2/E3 genuinely contested)
// - Personal: 3 (P1-P3 all realistic user-profile decisions)
// - Ambiguous: 3 (A1-A3 test reframing capability specifically)
//
// Imbalance is deliberate: bench analysis should compare Vāda vs baseline
// on the full set, not category-by-category, until corpus grows to at
// least 5 questions per category.
//
// Metadata is prediction, not ground truth — analysis compares prediction
// vs actual to measure how well we understand Vāda's behavior.
// expected_terminal_likelihood reflects what the blind critic is likely
// to do on first pass, based on how well agents can converge. REVISED
// means we expect at least one revise→reaudit cycle.
//
// IDs are stable: retiring a question does not reassign its ID. T4/T5
// are new additions in corpus v2. B1/E1 are permanently retired.

export type Category = 'Technical' | 'Business' | 'Ethical' | 'Personal' | 'Ambiguous'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type TerminalLikelihood = 'CLEAN' | 'REVISED'

export interface BenchmarkQuestion {
  id: string
  text: string
  category: Category
  difficulty: Difficulty
  expected_terminal_likelihood: TerminalLikelihood
}

export const corpus: BenchmarkQuestion[] = [
  // ── Technical Architecture ────────────────────────────────────────────
  {
    id: 'T1',
    text: "We're a 3-person fintech team. Should we build on Vercel + Neon + Cloudflare Workers or a traditional AWS setup? We're optimizing for speed-to-market over cost.",
    category: 'Technical',
    difficulty: 'medium',
    expected_terminal_likelihood: 'CLEAN'
  },
  {
    id: 'T2',
    text: 'Our Next.js codebase has four engineers who disagree: migrate to tRPC, stay with REST, or add GraphQL? The API is currently a mix of all three.',
    category: 'Technical',
    difficulty: 'easy',
    expected_terminal_likelihood: 'CLEAN'
  },
  {
    id: 'T3',
    text: "We're hitting database bottlenecks at 500k DAU. Should we add Redis caching, add a read replica, or redesign the schema? We have 8 weeks and two engineers.",
    category: 'Technical',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  {
    id: 'T4',
    text: "Our 4-person team needs to pick a CI system. Should we use GitHub Actions or CircleCI? We're already fully on GitHub.",
    category: 'Technical',
    difficulty: 'easy',
    expected_terminal_likelihood: 'CLEAN'
  },
  {
    id: 'T5',
    text: "We're building a read-heavy analytics dashboard. Should we use PostgreSQL or MongoDB?",
    category: 'Technical',
    difficulty: 'easy',
    expected_terminal_likelihood: 'CLEAN'
  },
  // ── Business Strategy ─────────────────────────────────────────────────
  {
    id: 'B2',
    text: 'Should we price our B2B dev tool at $49/month flat or usage-based? We have 30 beta users, mostly early-stage startups, and our main cost is LLM API calls.',
    category: 'Business',
    difficulty: 'medium',
    expected_terminal_likelihood: 'CLEAN'
  },
  {
    id: 'B3',
    text: 'A strategic acquirer just offered $8M for our company. We have $2M ARR growing 15% MoM and 18 months of runway. Do we sell?',
    category: 'Business',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  // ── Ethical / Values Dilemmas ─────────────────────────────────────────
  {
    id: 'E2',
    text: 'We discovered a data privacy bug that has been logging user messages unintentionally for 6 months. Our Series A closes in 3 weeks. When and how do we disclose?',
    category: 'Ethical',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  {
    id: 'E3',
    text: 'Our hiring AI performs 12% worse for non-native English speakers. We have paying customers waiting to onboard. Do we ship now and fix later, or delay launch?',
    category: 'Ethical',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  // ── Personal Life Decisions ───────────────────────────────────────────
  {
    id: 'P1',
    text: "I have 12 months of runway on my savings and a competitive contract job offer. The job pays well but would consume the time I'm using to build my own product. Do I accept or extend the runway?",
    category: 'Personal',
    difficulty: 'medium',
    expected_terminal_likelihood: 'REVISED'
  },
  {
    id: 'P2',
    text: "I've been in a long-distance relationship for 2 years. My partner won't relocate. I just received a dream job offer in their city but I'm not excited about the role. What do I do?",
    category: 'Personal',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  {
    id: 'P3',
    text: "I'm 35, hate my job, and want to start a company. I have a mortgage, two young kids, and $80k in savings. Is now the right time?",
    category: 'Personal',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  // ── Ambiguous Framing ─────────────────────────────────────────────────
  {
    id: 'A1',
    text: 'Our engineering team of 10 has missed 3 of the last 4 quarterly deadlines despite working long hours. Management wants to add stricter estimation processes. What should we actually do?',
    category: 'Ambiguous',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  {
    id: 'A2',
    text: "We're not profitable yet. Should we cut costs or grow faster to reach profitability?",
    category: 'Ambiguous',
    difficulty: 'hard',
    expected_terminal_likelihood: 'REVISED'
  },
  {
    id: 'A3',
    text: 'Our product has great engagement metrics but almost no one converts to paid. Should we add a paywall?',
    category: 'Ambiguous',
    difficulty: 'medium',
    expected_terminal_likelihood: 'REVISED'
  }
]
