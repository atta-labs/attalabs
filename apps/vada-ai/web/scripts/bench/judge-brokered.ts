// Brokered benchmark judge — compares brokered consultations vs single-shot Sonnet baseline.
//
// Usage:
//   bun scripts/bench/judge-brokered.ts <session_id> [<session_id> ...]
//   bun scripts/bench/judge-brokered.ts --recent 5
//   VADA_RUN_LABEL="phase-6" bun scripts/bench/judge-brokered.ts --recent 3
//
// Writes one benchmark_runs row per session judged.

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { db } from '@/db'
import { benchmarkRuns, mcpSessions } from '@/db/schema'
import { hashQuestion } from '@/lib/question-hash'
import { eq, desc } from 'drizzle-orm'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set')
  process.exit(1)
}

const JUDGE_MODEL = 'claude-sonnet-4-6'
const BASELINE_MODEL = 'claude-sonnet-4-6'
const BASELINE_LABEL = 'single-shot-sonnet'
const RUN_LABEL = process.env.VADA_RUN_LABEL ?? null

const BASELINE_SYSTEM_PROMPT = "Answer the user's question directly. Be specific and decisive. No caveats, no hedging."

const BROKERED_JUDGE_SYSTEM_PROMPT = `You are a neutral evaluator comparing two responses to the same question.

Response A: single-shot Sonnet (no deliberation, one model call).
Response B: Vāda brokered consultation (multiple independent reviewers — Strategist, Critic, Devil's Advocate — each responding to the same question from their distinct perspective).

Evaluate on these five criteria. Score each 1–5.

1. ALTERNATIVES_CONSIDERED — Did the response surface meaningful options beyond the obvious, or just restate the expected alternatives?
   1 = only the obvious; 3 = some non-obvious angles; 5 = multiple overlooked alternatives surfaced with analysis

2. ASSUMPTIONS_SURFACED — Did the response make the implicit premises of the question explicit and challenge them?
   1 = no assumptions challenged; 3 = some premises named; 5 = core assumptions identified, challenged, and reframed

3. ACTIONABLE_SPECIFICITY — Are the recommendations specific enough to act on, or generic principles?
   1 = pure abstraction; 3 = directional but vague; 5 = specific actions with conditions and tradeoffs

4. CONFIDENCE_CALIBRATION — Does the response convey appropriate certainty/uncertainty, or is it systematically overconfident or hedging?
   1 = wildly miscalibrated; 3 = adequate calibration; 5 = well-calibrated: confident where evidence supports, uncertain where not

5. REVIEWER_DIVERGENCE — [Brokered-only] Did the reviewers genuinely compress reality differently, or produce correlated outputs that said the same thing in different words?
   1 = essentially identical outputs; 3 = different framing, same conclusions; 5 = genuinely orthogonal perspectives with distinct actionable recommendations
   Note: for Response A (single reviewer), score based on whether it presents multiple genuine perspectives internally.

Write a concise analysis (roughly 200–400 words) comparing the two responses on these five criteria. Be specific — quote short passages when making a point. Then output the structured block below EXACTLY (no extra text after it):

---
ALTERNATIVES_CONSIDERED: <1-5>
ASSUMPTIONS_SURFACED: <1-5>
ACTIONABLE_SPECIFICITY: <1-5>
CONFIDENCE_CALIBRATION: <1-5>
REVIEWER_DIVERGENCE: <1-5>
AGGREGATE: <average to 1 decimal>
VERDICT: <vada_wins|baseline_wins|tie>`

const SCORE_PATTERN =
  /ALTERNATIVES_CONSIDERED:\s*(\d)\s*\nASSUMPTIONS_SURFACED:\s*(\d)\s*\nACTIONABLE_SPECIFICITY:\s*(\d)\s*\nCONFIDENCE_CALIBRATION:\s*(\d)\s*\nREVIEWER_DIVERGENCE:\s*(\d)\s*\nAGGREGATE:\s*([\d.]+)\s*\nVERDICT:\s*(vada_wins|baseline_wins|tie)/i

interface ParsedScores {
  alternativesConsidered: number
  assumptionsSurfaced: number
  actionableSpecificity: number
  confidenceCalibration: number
  reviewerDivergence: number
  aggregate: number
  verdict: 'vada_wins' | 'baseline_wins' | 'tie'
}

function parseScores(judgeResponse: string): ParsedScores | null {
  const m = judgeResponse.match(SCORE_PATTERN)
  if (!m) return null
  return {
    alternativesConsidered: Number.parseInt(m[1]!, 10),
    assumptionsSurfaced: Number.parseInt(m[2]!, 10),
    actionableSpecificity: Number.parseInt(m[3]!, 10),
    confidenceCalibration: Number.parseInt(m[4]!, 10),
    reviewerDivergence: Number.parseInt(m[5]!, 10),
    aggregate: Number.parseFloat(m[6]!),
    verdict: m[7]!.toLowerCase() as 'vada_wins' | 'baseline_wins' | 'tie'
  }
}

async function runBaseline(
  question: string
): Promise<{ text: string; tokensIn: number; tokensOut: number; elapsedMs: number }> {
  const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY })
  const start = Date.now()
  const result = await generateText({
    model: anthropic(BASELINE_MODEL),
    system: BASELINE_SYSTEM_PROMPT,
    prompt: question,
    maxTokens: 1500
  })
  return {
    text: result.text,
    tokensIn: result.usage.promptTokens,
    tokensOut: result.usage.completionTokens,
    elapsedMs: Date.now() - start
  }
}

async function runJudge(
  question: string,
  responseA: string,
  responseB: string
): Promise<{ text: string; tokensIn: number; tokensOut: number; elapsedMs: number }> {
  const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY })
  const userPrompt = `## Question\n\n${question.trim()}\n\n## Response A (single-shot Sonnet, no deliberation)\n\n${responseA.trim()}\n\n## Response B (Vāda brokered consultation)\n\n${responseB.trim()}`
  const start = Date.now()
  const result = await generateText({
    model: anthropic(JUDGE_MODEL),
    system: BROKERED_JUDGE_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxTokens: 2000
  })
  return {
    text: result.text,
    tokensIn: result.usage.promptTokens,
    tokensOut: result.usage.completionTokens,
    elapsedMs: Date.now() - start
  }
}

async function judgeSession(session: typeof mcpSessions.$inferSelect): Promise<void> {
  const question = session.context ? `${session.context}\n\n## Question\n${session.prompt}` : session.prompt

  console.info(`\n${'─'.repeat(60)}`)
  console.info(`Session: ${session.id}`)
  console.info(`Q: ${session.prompt.slice(0, 80)}...`)

  // 1. Run baseline
  console.info('  Running baseline (single-shot Sonnet)...')
  const baselineStart = Date.now()
  let baseline: Awaited<ReturnType<typeof runBaseline>>
  try {
    baseline = await runBaseline(question)
  } catch (err) {
    console.error('  Baseline failed:', err)
    return
  }
  console.info(`  Baseline done: ${baseline.tokensOut} tokens out, ${Date.now() - baselineStart}ms`)

  // 2. Run judge
  console.info('  Running judge...')
  const judgeStart = Date.now()
  let judgeResult: Awaited<ReturnType<typeof runJudge>>
  try {
    judgeResult = await runJudge(question, baseline.text, session.response)
  } catch (err) {
    console.error('  Judge failed:', err)
    return
  }
  console.info(`  Judge done: ${judgeResult.tokensOut} tokens out, ${Date.now() - judgeStart}ms`)

  // 3. Parse scores
  const scores = parseScores(judgeResult.text)
  if (!scores) {
    console.error('  PARSE FAILURE — judge output did not match expected format')
    console.error('  Last 300 chars of judge output:')
    console.error(`  ${judgeResult.text.slice(-300)}`)
    return
  }

  console.info(
    `  Scores: alt=${scores.alternativesConsidered} assump=${scores.assumptionsSurfaced} action=${scores.actionableSpecificity} conf=${scores.confidenceCalibration} div=${scores.reviewerDivergence} agg=${scores.aggregate}`
  )
  console.info(`  Verdict: ${scores.verdict}`)

  // 4. Write to DB
  await db.insert(benchmarkRuns).values({
    sessionType: 'brokered',
    sessionId: session.id,
    questionHash: hashQuestion(session.prompt),
    judgeModel: JUDGE_MODEL,
    judgeVerdict: scores.verdict,
    judgeScore: Math.round(scores.aggregate * 10),
    judgeReasoning: judgeResult.text,
    reviewerScores: {
      alternativesConsidered: scores.alternativesConsidered,
      assumptionsSurfaced: scores.assumptionsSurfaced,
      actionableSpecificity: scores.actionableSpecificity,
      confidenceCalibration: scores.confidenceCalibration,
      reviewerDivergence: scores.reviewerDivergence,
      aggregate: scores.aggregate
    },
    baselineLabel: BASELINE_LABEL,
    baselineResponse: baseline.text,
    runLabel: RUN_LABEL,
    tags: ['brokered', 'phase-6']
  })

  console.info('  ✓ Written to benchmark_runs')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let sessionIds: string[] = []

  if (args[0] === '--recent') {
    const n = Number.parseInt(args[1] ?? '5', 10)
    const recent = await db
      .select({ id: mcpSessions.id })
      .from(mcpSessions)
      .orderBy(desc(mcpSessions.createdAt))
      .limit(n)
    sessionIds = recent.map((r) => r.id)
    console.info(`Judging ${sessionIds.length} most recent sessions`)
  } else if (args.length > 0) {
    sessionIds = args
    console.info(`Judging ${sessionIds.length} specified sessions`)
  } else {
    console.error('Usage: judge-brokered.ts <session_id> [...] | --recent <n>')
    process.exit(1)
  }

  let succeeded = 0
  let failed = 0

  for (const id of sessionIds) {
    const rows = await db.select().from(mcpSessions).where(eq(mcpSessions.id, id)).limit(1)
    const session = rows[0]
    if (!session) {
      console.error(`Session not found: ${id}`)
      failed++
      continue
    }
    try {
      await judgeSession(session)
      succeeded++
    } catch (err) {
      console.error(`Error judging ${id}:`, err)
      failed++
    }
  }

  console.info(`\nDone. ${succeeded} succeeded, ${failed} failed.`)
}

await main()
