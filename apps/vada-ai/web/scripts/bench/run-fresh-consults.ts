// Runs 3 fresh vada__consult sessions with the new prompts and prints session IDs.
// Run from apps/vada-ai/web/:  bun scripts/bench/run-fresh-consults.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { validateAndNormalize, runConsult } from '../../../mcp-server/src/tools/consult'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const questions = [
  // Q1 — Strategic / architectural
  {
    label: 'Q1 — Monolith vs microservices scaling decision',
    input: {
      context:
        'We are a 15-person engineering team running a Next.js monolith backed by a single Postgres instance. The product is a B2B SaaS platform. We have been experiencing 3× month-over-month traffic growth for the past quarter and are starting to hit database connection limits and deployment bottlenecks. The team is split: some engineers want to start extracting microservices now, others think we should optimize the monolith first.',
      question:
        'Should we begin decomposing the monolith into microservices now, or invest the next quarter in optimizing the existing monolith?',
      current_leaning:
        'Leaning toward monolith optimization — our team is small and microservices overhead could slow us down.',
      stakes:
        'If we optimize the monolith and hit a hard ceiling in 3 months, we will be scrambling during peak growth. If we start microservices now and velocity drops, we may miss a critical market window.',
      reviewers: [
        {
          role: 'strategist' as const,
          notes:
            'Map the actual scaling ceiling: what is the evidence that the monolith cannot be optimized further? What does a microservices path cost in team velocity for a 15-person team?'
        },
        {
          role: 'critic' as const,
          notes:
            'Attack the load-bearing assumption that microservices solve the scaling problem. What has to be true for a 15-person team to succeed with microservices, and is it?'
        },
        {
          role: 'devils_advocate' as const,
          notes:
            'Challenge whether decomposing vs optimizing is even the right decision frame. Is there a third option being ignored entirely?'
        }
      ]
    }
  },

  // Q2 — Operational / team ritual
  {
    label: 'Q2 — Daily standup reform or termination',
    input: {
      context:
        'Engineering team of 8. We have run daily 9am standups for two years. Over the past 3 months, attendance has declined to roughly 50%. The other half sends async updates in a Slack channel instead. There is no explicit policy — it just evolved. The people who skip say the standup adds no value for their work style. The people who attend say it is the only time they get cross-team visibility.',
      question: 'Should we kill the daily standup entirely, or try to reform it?',
      current_leaning: 'Leaning toward killing it — if half the team is already opting out, the ritual is not working.',
      stakes:
        'Risk of killing: lose the synchronous cross-team visibility that the other half values. Risk of reforming: create a mandate that breeds resentment in the half that opted out. Risk of status quo: the ritual continues to decay.',
      reviewers: [
        {
          role: 'strategist' as const,
          notes:
            'What problem does the standup actually solve, and what is the real cost of losing it? Are there alternatives that solve the same problem without the attendance issue?'
        },
        {
          role: 'critic' as const,
          notes:
            'Attack the assumption that killing the standup will preserve team cohesion. What happens to cross-team visibility with async-only communication at this team size?'
        },
        {
          role: 'devils_advocate' as const,
          notes:
            'Challenge whether the standup problem is actually a symptom of a different, deeper problem with team alignment or trust. Is the Principal solving the wrong thing?'
        }
      ]
    }
  },

  // Q3 — Personal / career risk
  {
    label: 'Q3 — Big tech vs seed-stage CTO offer',
    input: {
      context:
        'I am a 35-year-old senior engineer at a large tech company earning $280k total compensation. I have received an offer for a CTO role at a seed-stage B2B SaaS startup. The offer is $150k salary plus 20,000 shares (roughly 0.8% of the company post-series-A). The startup has 6 months of runway and has not yet closed a Series A. Traction is early but real: $40k MRR growing 15% month-over-month. The founding team is strong. I have a 6-month-old child and a mortgage. My spouse works and covers roughly 40% of household expenses.',
      question: 'Should I take the CTO role at the startup?',
      current_leaning:
        'Leaning toward staying at big tech — 6 months of runway is too thin given personal financial obligations.',
      stakes:
        'If I stay: forfeit a potentially high-upside opportunity and the CTO title I have been targeting. If I take it: face financial stress if the startup fails to raise a Series A within 5 months, with a 6-month-old and a mortgage.',
      reviewers: [
        {
          role: 'strategist' as const,
          notes:
            'Map the actual risk profile: what is the probability the startup closes a Series A given the traction? What is the expected value of 0.8% equity at different outcomes? What does staying cost in career trajectory?'
        },
        {
          role: 'critic' as const,
          notes:
            'Attack the assumption that this is a binary choice. What are the load-bearing risks that could make this go badly, and how many of them does the Principal actually know the answer to?'
        },
        {
          role: 'devils_advocate' as const,
          notes:
            'Challenge whether "take the job or not" is the right question. Is there a negotiation or restructuring of the offer that changes the risk calculus entirely?'
        }
      ]
    }
  }
]

const sessionIds: string[] = []

for (const q of questions) {
  console.info(`\n${'─'.repeat(70)}`)
  console.info(q.label)
  console.info(`─${'─'.repeat(69)}`)

  const validation = validateAndNormalize(q.input)
  if (!validation.valid) {
    console.error('Validation failed:', JSON.stringify(validation.errors, null, 2))
    process.exit(1)
  }

  const start = Date.now()
  let result: Awaited<ReturnType<typeof runConsult>>
  try {
    result = await runConsult(validation.data, ANTHROPIC_API_KEY, 'smoke-test')
  } catch (err) {
    console.error('runConsult failed:', err)
    process.exit(1)
  }

  const elapsed = Date.now() - start
  sessionIds.push(result.session_id)

  console.info(`Session ID: ${result.session_id}`)
  console.info(`Duration:   ${(elapsed / 1000).toFixed(1)}s`)
  console.info(`Cost est:   $${result.cost_breakdown.estimated_usd.toFixed(4)}`)
  console.info(`Tokens:     ${result.cost_breakdown.tokens_input}in / ${result.cost_breakdown.tokens_output}out`)
  console.info(`Reviewers:  ${result.responses.map((r) => r.reviewer).join(', ')}`)
}

console.info(`\n${'═'.repeat(70)}`)
console.info('Session IDs for judge run:')
for (const id of sessionIds) {
  console.info(`  ${id}`)
}
console.info('\nRun judge with:')
console.info(`  bun scripts/bench/judge-brokered.ts ${sessionIds.join(' ')}`)
