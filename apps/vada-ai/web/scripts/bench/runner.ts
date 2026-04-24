import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { getBenchmarkMetrics } from '@/db/queries'
import type { BenchmarkQuestion } from './corpus'
import type { BudgetTracker } from './budget'

const BASE_URL = process.env.VADA_BASE_URL ?? 'http://localhost:3003'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? ''
const CLERK_SESSION_ID = process.env.CLERK_SESSION_ID ?? 'sess_3CSsNVZgk2K5KBYx0eZDqALfkBA'

const PROVIDER = 'anthropic' as const
const MODEL_ID = 'claude-sonnet-4-6'

// Source of truth for these prompts: useJudgeBenchmark.ts (judge) and
// useDeliberateForm.ts (baseline). Copied here for direct server-side use.
export const BASELINE_SYSTEM_PROMPT =
  "Answer the user's question directly. No framing, no caveats. If code is useful, include it."

const JUDGE_SYSTEM_PROMPT = `You are an impartial judge. You are given:
1. A question from the Principal.
2. Response A, produced by a single call to you (no deliberation).
3. Response B, produced by a multi-round multi-agent deliberation using the same base model.

Compare the two responses on: decisiveness, depth, accuracy, usefulness. Identify where the deliberation added genuine value and where it added noise or repetition. Be specific — quote short passages when making a point. Conclude with a one-line verdict: which response would you recommend the Principal act on, and why. Keep your full response to about 100 lines of markdown.

After your markdown response, on a final separate line, output exactly: \`DIAGNOSIS: <CATEGORY> — <one-sentence reason>\` where CATEGORY is one of:
- VADA_WON (deliberation produced a meaningfully better answer than the single-shot)
- BASELINE_WON (the single-shot answer was better)
- TIE (both answers were roughly equivalent)
- NEGLIGIBLE_DIFFERENCE (both answers converged on the same conclusion with no meaningful difference in quality)
- PIPELINE_FAILURE (the deliberation output was corrupted, truncated, or contained code/claims not supported by the deliberation itself)`

const DIAGNOSIS_PATTERN = /DIAGNOSIS:\s*(VADA_WON|BASELINE_WON|TIE|NEGLIGIBLE_DIFFERENCE|PIPELINE_FAILURE)\b/i

function buildJudgeUserPrompt(question: string, responseA: string, responseB: string): string {
  return `## Question\n\n${question.trim()}\n\n## Response A (single-shot, no deliberation)\n\n${responseA.trim()}\n\n## Response B (Vāda deliberation, synthesized from multi-agent rounds)\n\n${responseB.trim()}`
}

async function getClerkToken(): Promise<string> {
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not set')
  const res = await fetch(`https://api.clerk.com/v1/sessions/${CLERK_SESSION_ID}/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Clerk token fetch failed: ${res.status}`)
  const data = (await res.json()) as { jwt: string }
  return data.jwt
}

export class BudgetExhaustedError extends Error {
  constructor() {
    super('Budget cap reached — stopping run')
  }
}

export interface RunResult {
  questionId: string
  sessionId: string
  diagnosis: string | null
  vadaRecommendationSnippet: string
  baselineAnswerSnippet: string
  vadaTokensIn: number
  vadaTokensOut: number
  baselineTokensIn: number
  baselineTokensOut: number
  judgeTokensIn: number
  judgeTokensOut: number
  vadaElapsedMs: number
  baselineElapsedMs: number
  judgeElapsedMs: number
}

export async function runQuestion(question: BenchmarkQuestion, budget: BudgetTracker): Promise<RunResult> {
  let token = await getClerkToken()
  const auth = (): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  })

  // ── 1. Create session (benchmark=true initialises benchmark_metrics row) ──
  const startRes = await fetch(`${BASE_URL}/api/deliberation/start`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ question: question.text, provider: PROVIDER, modelId: MODEL_ID, benchmark: true })
  })
  if (!startRes.ok) throw new Error(`Session creation failed: ${startRes.status} ${await startRes.text()}`)
  const { session_id: sessionId } = (await startRes.json()) as { session_id: string }

  // ── 2. Run Vāda via Mastra workflow route ──────────────────────────────────
  const vadaStart = Date.now()
  token = await getClerkToken()
  const workflowRes = await fetch(`${BASE_URL}/api/deliberation/${sessionId}/workflow/run?sync=true`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ apiKey: ANTHROPIC_API_KEY }),
    signal: AbortSignal.timeout(25 * 60 * 1000)
  })
  const vadaElapsedMs = Date.now() - vadaStart
  if (!workflowRes.ok) throw new Error(`Workflow failed: ${workflowRes.status} ${await workflowRes.text()}`)

  // ── 3. Fetch conclusion ────────────────────────────────────────────────────
  token = await getClerkToken()
  const sessionRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers: auth() })
  if (!sessionRes.ok) throw new Error(`Session fetch failed: ${sessionRes.status}`)
  const sessionData = (await sessionRes.json()) as { conclusion: Record<string, unknown> | null }
  const recommendation =
    typeof sessionData.conclusion?.recommendation === 'string' ? sessionData.conclusion.recommendation : null
  if (!recommendation) throw new Error(`No recommendation in session ${sessionId}`)

  // ── 4. Record Vāda token cost from DB aggregates ───────────────────────────
  const metrics = await getBenchmarkMetrics(sessionId)
  const vadaTokensIn = metrics?.deliberationTokensInput ?? 0
  const vadaTokensOut = metrics?.deliberationTokensOutput ?? 0
  budget.record(vadaTokensIn, vadaTokensOut)
  if (budget.exhausted) throw new BudgetExhaustedError()

  // ── 5. Run baseline ────────────────────────────────────────────────────────
  const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY })
  const baselineStart = Date.now()
  const baselineResult = await generateText({
    model: anthropic(MODEL_ID),
    system: BASELINE_SYSTEM_PROMPT,
    prompt: question.text
  })
  const baselineAnswer = baselineResult.text
  const baselineTokensIn = baselineResult.usage.inputTokens
  const baselineTokensOut = baselineResult.usage.outputTokens
  const baselineElapsedMs = Date.now() - baselineStart
  budget.record(baselineTokensIn, baselineTokensOut)

  token = await getClerkToken()
  const baselinePostRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/baseline`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({
      answer: baselineAnswer,
      provider: PROVIDER,
      modelId: MODEL_ID,
      tokensInput: baselineTokensIn,
      tokensOutput: baselineTokensOut,
      elapsedMs: baselineElapsedMs
    })
  })
  if (!baselinePostRes.ok) throw new Error(`Baseline POST failed: ${baselinePostRes.status}`)

  if (budget.exhausted) throw new BudgetExhaustedError()

  // ── 6. Run judge ───────────────────────────────────────────────────────────
  const judgeStart = Date.now()
  const judgeResult = await generateText({
    model: anthropic(MODEL_ID),
    system: JUDGE_SYSTEM_PROMPT,
    prompt: buildJudgeUserPrompt(question.text, baselineAnswer, recommendation)
  })
  const judgeResponse = judgeResult.text
  const judgeTokensIn = judgeResult.usage.inputTokens
  const judgeTokensOut = judgeResult.usage.outputTokens
  const judgeElapsedMs = Date.now() - judgeStart
  const diagnosis = DIAGNOSIS_PATTERN.exec(judgeResponse)?.[1]?.toUpperCase() ?? null
  budget.record(judgeTokensIn, judgeTokensOut)

  token = await getClerkToken()
  const judgePostRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}/judge`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({
      response: judgeResponse,
      provider: PROVIDER,
      modelId: MODEL_ID,
      diagnosis,
      tokensInput: judgeTokensIn,
      tokensOutput: judgeTokensOut,
      elapsedMs: judgeElapsedMs
    })
  })
  if (!judgePostRes.ok) throw new Error(`Judge POST failed: ${judgePostRes.status}`)

  return {
    questionId: question.id,
    sessionId,
    diagnosis,
    vadaRecommendationSnippet: recommendation.slice(0, 200),
    baselineAnswerSnippet: baselineAnswer.slice(0, 200),
    vadaTokensIn,
    vadaTokensOut,
    baselineTokensIn,
    baselineTokensOut,
    judgeTokensIn,
    judgeTokensOut,
    vadaElapsedMs,
    baselineElapsedMs,
    judgeElapsedMs
  }
}
