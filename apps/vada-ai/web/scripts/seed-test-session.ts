/**
 * Seed a complete test deliberation session into the database.
 * Run: DATABASE_URL='...' bun run scripts/seed-test-session.ts
 *
 * This creates a full session with 3 rounds of transcript entries
 * and a CLEAN conclusion — no API calls, no money spent.
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function seed() {
  // 1. Create or find test user
  const existingUsers = await db.select().from(schema.users).limit(1)
  let userId: string

  if (existingUsers[0]) {
    userId = existingUsers[0].id
    console.info(`Using existing user: ${userId}`)
  } else {
    const [user] = await db
      .insert(schema.users)
      .values({ clerkId: 'test_seed_user', email: 'test@vada.ai' })
      .returning()
    userId = user!.id
    console.info(`Created test user: ${userId}`)
  }

  // 2. Create session
  const agents = ['strategist', 'critic', 'devils_advocate', 'synthesizer']
  const question = 'Should we build a mobile app or focus on improving the web experience first?'

  const [session] = await db
    .insert(schema.sessions)
    .values({
      userId,
      question,
      agents,
      state: 'TERMINAL',
      terminalState: 'CLEAN'
    })
    .returning()

  const sessionId = session!.id
  console.info(`Created session: ${sessionId}`)

  // 3. Insert Round 1 entries (parallel — all agents respond to the question)
  const round1 = [
    {
      agent: 'Strategist',
      content: `The strategic landscape here is clear: mobile represents the growth vector, but web is where your current users live.

**The case for web-first:**
- Your existing user base is already engaged on web
- Web improvements have faster iteration cycles (no app store review)
- Progressive Web Apps (PWAs) can bridge the mobile gap temporarily
- Lower development cost per feature

**The case for mobile-first:**
- Mobile usage is 70%+ of internet traffic globally
- Push notifications drive 3-10x better retention
- Native features (camera, location, offline) enable new use cases
- App store presence builds brand credibility

**My recommendation:** Invest 60% in web improvements, 40% in mobile foundation. Ship web improvements in Q1, launch mobile MVP in Q2. This isn't either/or — it's sequencing.`
    },
    {
      agent: 'Critic',
      content: `The "do both" answer is a cop-out. Here's why the framing is wrong:

**Problem 1: Resource reality.** "60/40 split" assumes you have enough engineers for both. Most teams don't. A split focus means both products ship slower, buggier, and with less polish.

**Problem 2: The web is not "done."** If your web experience needs improvement, that means it's currently failing users. Shipping a mobile app while your web product is weak means you're now failing users on TWO platforms instead of one.

**Problem 3: Mobile isn't just "build an app."** It's a new deployment pipeline, new testing infrastructure, new crash reporting, new analytics, app store optimization, review management. The hidden costs are 2-3x what teams estimate.

**The hard truth:** Pick one. Make it excellent. Then expand. Trying to do both with limited resources is the most common way startups waste runway.`
    },
    {
      agent: "Devil's Advocate",
      content: `Everyone is assuming the choice is between mobile and web. But what if neither is the right question?

**The question you should be asking:** Why do users need a "better experience" in the first place?

If the answer is "the UI is slow" — that's a performance problem, not a platform problem. Fix the backend.

If the answer is "users can't find features" — that's a design problem. A mobile app with the same confusing navigation solves nothing.

If the answer is "we're losing users to competitors" — which competitors? Are they winning because of platform, or because of features?

**The uncomfortable possibility:** Maybe the product itself needs rethinking, and building on a new platform is a way to avoid confronting that.

What evidence do you have that platform choice — not product quality — is the actual constraint on growth?`
    },
    {
      agent: 'Synthesizer',
      content: `Mapping the initial positions:

**Convergence:** All agents agree that resources are finite and sequencing matters. Nobody advocates simultaneous full-investment in both platforms.

**Divergence:**
- Strategist sees this as a sequencing problem (web then mobile)
- Critic sees this as a focus problem (pick one, do it well)
- Devil's Advocate sees this as potentially the wrong question entirely

**The key tension:** Is platform choice the actual lever for growth, or is it a proxy for deeper product questions?

**Unresolved:** We need to know what "improving the web experience" actually means. Performance? Features? Design? Each implies a different answer to the mobile question.`
    }
  ]

  for (let i = 0; i < round1.length; i++) {
    await db.insert(schema.transcriptEntries).values({
      sessionId,
      round: 1,
      agent: round1[i]!.agent,
      content: round1[i]!.content,
      orderInRound: i
    })
  }
  console.info('Inserted Round 1 (4 entries)')

  // 4. Insert Round 2 entries (sequential — agents respond to each other)
  const round2 = [
    {
      agent: 'Strategist',
      content: `[TARGET: Critic] You say "pick one" but that's survivorship bias — you only hear about the companies that picked correctly. The ones that picked wrong are dead and can't tell their story.

The 60/40 split isn't "do both poorly." It's "invest in your strength while building optionality." Web improvements ship this quarter and generate revenue. Mobile foundation means you're not starting from zero when the data says it's time.

[TARGET: Devil's Advocate] You're right that we need to know WHY the web experience needs improvement. But the question assumed it does, so let's work with that constraint rather than relitigating the premise.`
    },
    {
      agent: 'Critic',
      content: `[TARGET: Strategist] "Building optionality" is how teams justify spreading thin. A 40% mobile investment isn't a foundation — it's a prototype that will need to be rewritten when you actually commit. You're paying twice.

And "the data will tell us when it's time" — what data? What's your trigger? If you can't name the specific metric that would trigger full mobile investment, you don't have a strategy. You have a hedge.`
    },
    {
      agent: "Devil's Advocate",
      content: `[TARGET: Strategist] You told me to stop "relitigating the premise" — but the premise IS the problem. If we can't articulate why the web experience is failing, how will we know if we've improved it? And if we don't know that, how will we know when it's "time" for mobile?

You're building a decision framework on top of undefined success criteria. That's not strategy — it's activity.`
    },
    {
      agent: 'Synthesizer',
      content: `The debate has sharpened. Key friction:

1. **Strategist vs Critic on resource allocation:** Split investment vs. focused commitment. This hinges on team size — with 3 engineers, a split is impossible. With 15, it's reasonable.

2. **Everyone vs the premise:** Devil's Advocate correctly notes we haven't defined what "improving web experience" means, which makes any platform decision premature.

3. **Emerging consensus:** Before deciding mobile vs. web, define what success looks like for the current product. The platform question comes second.`
    }
  ]

  for (let i = 0; i < round2.length; i++) {
    await db.insert(schema.transcriptEntries).values({
      sessionId,
      round: 2,
      agent: round2[i]!.agent,
      content: round2[i]!.content,
      orderInRound: i
    })
  }
  console.info('Inserted Round 2 (4 entries)')

  // 5. Insert Round 3 entries
  const round3 = [
    {
      agent: 'Strategist',
      content: `[TARGET: Critic] Fair point on the trigger metric. Here's mine: When web monthly active users plateau for 2 consecutive months while mobile web traffic exceeds 50% of total, that's the signal.

[TARGET: Devil's Advocate] You win on the success criteria point. Before any platform decision: define 3 web KPIs, set targets, measure for 30 days. If they're already met, the web is fine and mobile becomes the priority. If not, fix web first.`
    },
    {
      agent: 'Critic',
      content: `[TARGET: Strategist] That trigger metric is actually reasonable. But I'd add: the trigger should also include revenue impact, not just usage. Users can plateau while revenue grows (better monetization), or grow while revenue stalls (wrong users).

I'm converging toward: Fix web with measurable targets. Build mobile only when web targets are met AND mobile demand is evidenced by data.`
    },
    {
      agent: "Devil's Advocate",
      content: `[TARGET: Strategist] [TARGET: Critic] We've actually reached something useful: a data-driven decision framework instead of a gut-feel platform bet.

My remaining challenge: make sure the "web improvement" scope is time-boxed. Without a deadline, "fix web first" becomes "never build mobile" because there's always something to improve. Set a 90-day window. If web KPIs aren't met by then, revisit the entire product strategy, not just the platform question.`
    },
    {
      agent: 'Synthesizer',
      content: `The room has converged on a framework:

1. Define 3 web KPIs with specific targets
2. Time-box web improvement to 90 days
3. Measure: if KPIs met, mobile is next. If not, revisit product strategy.
4. Mobile trigger: web MAU plateau + mobile traffic >50% + revenue impact positive

The original either/or question has been reframed into a sequenced, data-driven decision process. The agents agree that the platform choice should follow evidence, not precede it.`
    }
  ]

  for (let i = 0; i < round3.length; i++) {
    await db.insert(schema.transcriptEntries).values({
      sessionId,
      round: 3,
      agent: round3[i]!.agent,
      content: round3[i]!.content,
      orderInRound: i
    })
  }
  console.info('Inserted Round 3 (4 entries)')

  // 6. Insert conclusion (CLEAN)
  const conclusionJson = {
    recommendation:
      'Focus on web improvements first with a 90-day time-boxed sprint. Define 3 measurable KPIs (e.g., page load time, feature adoption rate, user retention) with specific targets. Only begin mobile development when: (1) web KPIs are met, (2) web MAU plateaus for 2 consecutive months, and (3) mobile web traffic exceeds 50% of total traffic.',
    key_condition:
      'The team must define and commit to specific, measurable web KPIs before any work begins. Without clear success criteria, "improve the web" becomes an endless project that blocks mobile indefinitely.',
    unresolved_points: [
      {
        point: 'Optimal resource split if team decides to pursue parallel development',
        agents_involved: ['Strategist', 'Critic']
      },
      {
        point: 'Whether the web experience problems are symptoms of deeper product-market fit issues',
        agents_involved: ["Devil's Advocate"]
      }
    ],
    review_by: '2026-07-05',
    participants: [
      { agent: 'Strategist', version: 'v1' },
      { agent: 'Critic', version: 'v1' },
      { agent: "Devil's Advocate", version: 'v1' },
      { agent: 'Synthesizer', version: 'v1' }
    ]
  }

  await db.insert(schema.conclusions).values({
    sessionId,
    originalJson: conclusionJson,
    criticVerdict: 'PASS',
    terminalState: 'CLEAN',
    reviewBy: '2026-07-05'
  })
  console.info('Inserted CLEAN conclusion')

  console.info('\n--- SEED COMPLETE ---')
  console.info(`Session ID: ${sessionId}`)
  console.info(`View at: http://localhost:3003/deliberation/${sessionId}`)
}

seed().catch(console.error)
