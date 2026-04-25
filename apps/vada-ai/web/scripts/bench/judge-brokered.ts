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

Evaluate on these five criteria. Score each 1–5. Apply the criteria identically to both responses.

1. ASSUMPTION_SURFACING — Did the output identify assumptions the Principal did NOT explicitly state in the question? Surfacing unstated assumptions is high-value. Restating assumptions the Principal already named is low-value.
   1 = only restates stated premises; 3 = surfaces some unstated assumptions; 5 = identifies the load-bearing unstated assumptions and names what would change if they were wrong

2. ACTIONABLE_SPECIFICITY — Are the recommendations specific enough to act on, or generic principles?
   1 = pure abstraction with no actionable guidance; 3 = directional but vague ("consider X"); 5 = specific actions with conditions, decision criteria, and tradeoffs

3. CONFIDENCE_CALIBRATION — Does the response convey appropriate certainty/uncertainty, or is it systematically overconfident or hedging?
   1 = wildly miscalibrated (confident about uncertain things or uncertain about clear things); 3 = adequate calibration; 5 = well-calibrated: confident where evidence supports, explicitly uncertain where it does not, states what would change the answer

4. FRAME_QUALITY — Is the output solving the right problem at the right level of abstraction? Did it appropriately challenge or accept the framing of the question?
   1 = accepts the frame uncritically and answers the wrong question; 3 = notes framing limitations but still answers within them; 5 = correctly identifies whether the framing is sound, reframes if needed, and answers the right question

5. LENGTH_EFFICIENCY — Is the output denser than it is long? A concise, decisive answer should score higher than a padded one.
   1 = significant padding: repetition, throat-clearing, restated conclusions, hedging through word count; 3 = adequate density but could be tighter; 5 = every sentence adds information — nothing could be cut without losing signal

When scoring, explicitly adjust for length. A 200-word output that takes a strong position should score higher on LENGTH_EFFICIENCY than a 600-word output that hedges through repetition. If an output is longer but not denser, note the padding in your analysis.

Write a concise analysis (roughly 200–400 words) comparing the two responses on these five criteria. Be specific — quote short passages when making a point. Then output the structured block below EXACTLY (no extra text after it):

---
ASSUMPTION_SURFACING: <1-5>
ACTIONABLE_SPECIFICITY: <1-5>
CONFIDENCE_CALIBRATION: <1-5>
FRAME_QUALITY: <1-5>
LENGTH_EFFICIENCY: <1-5>
AGGREGATE: <average to 1 decimal>
VERDICT: <vada_wins|baseline_wins|tie>`

const SCORE_PATTERN =
  /ASSUMPTION_SURFACING:\s*(\d)\s*\nACTIONABLE_SPECIFICITY:\s*(\d)\s*\nCONFIDENCE_CALIBRATION:\s*(\d)\s*\nFRAME_QUALITY:\s*(\d)\s*\nLENGTH_EFFICIENCY:\s*(\d)\s*\nAGGREGATE:\s*([\d.]+)\s*\nVERDICT:\s*(vada_wins|baseline_wins|tie)/i

interface ParsedScores {
  assumptionSurfacing: number
  actionableSpecificity: number
  confidenceCalibration: number
  frameQuality: number
  lengthEfficiency: number
  aggregate: number
  verdict: 'vada_wins' | 'baseline_wins' | 'tie'
}

function parseScores(judgeResponse: string): ParsedScores | null {
  const m = judgeResponse.match(SCORE_PATTERN)
  if (!m) return null
  return {
    assumptionSurfacing: Number.parseInt(m[1]!, 10),
    actionableSpecificity: Number.parseInt(m[2]!, 10),
    confidenceCalibration: Number.parseInt(m[3]!, 10),
    frameQuality: Number.parseInt(m[4]!, 10),
    lengthEfficiency: Number.parseInt(m[5]!, 10),
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
    tokensIn: result.usage.inputTokens ?? 0,
    tokensOut: result.usage.outputTokens ?? 0,
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
    tokensIn: result.usage.inputTokens ?? 0,
    tokensOut: result.usage.outputTokens ?? 0,
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
    `  Scores: asmp=${scores.assumptionSurfacing} action=${scores.actionableSpecificity} conf=${scores.confidenceCalibration} frame=${scores.frameQuality} len=${scores.lengthEfficiency} agg=${scores.aggregate}`
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
      assumptionSurfacing: scores.assumptionSurfacing,
      actionableSpecificity: scores.actionableSpecificity,
      confidenceCalibration: scores.confidenceCalibration,
      frameQuality: scores.frameQuality,
      lengthEfficiency: scores.lengthEfficiency,
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
