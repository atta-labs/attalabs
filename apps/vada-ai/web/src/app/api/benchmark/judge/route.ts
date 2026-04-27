// POST /api/benchmark/judge
// Runs the AI judge evaluation server-side and persists verdict + diagnosis.
// apiKey transits server memory for this request only. See /trust.
import 'server-only'
import { auth } from '@atta/auth/hooks'
import type { RouteProvider } from '@atta/models'
import { resolveModel } from '@atta/models/server'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBenchmarkMetrics, getOrCreateUser, getSessionForUser, saveJudgeMetrics } from '@/db/queries'

export const maxDuration = 120

const Schema = z.object({
  sessionId: z.string(),
  question: z.string().min(1),
  baselineAnswer: z.string().min(1),
  vadaRecommendation: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  apiKey: z.string()
})

// Locked — do not modify. See memory: feedback_judge_prompt_locked.md
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

function buildJudgePrompt(question: string, responseA: string, responseB: string): string {
  return `## Question\n\n${question.trim()}\n\n## Response A (single-shot, no deliberation)\n\n${responseA.trim()}\n\n## Response B (Vāda deliberation, synthesized from multi-agent rounds)\n\n${responseB.trim()}`
}

const DIAGNOSIS_PATTERN = /DIAGNOSIS:\s*(VADA_WON|BASELINE_WON|TIE|NEGLIGIBLE_DIFFERENCE|PIPELINE_FAILURE)\b/i

function parseDiagnosis(text: string): string | null {
  const match = DIAGNOSIS_PATTERN.exec(text)
  return match?.[1]?.toUpperCase() ?? null
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { sessionId, question, baselineAnswer, vadaRecommendation, provider, modelId, apiKey } = parsed.data

  await getOrCreateUser(clerkId, '')

  const session = await getSessionForUser(sessionId, clerkId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 403 })

  const metrics = await getBenchmarkMetrics(sessionId)
  if (!metrics) return NextResponse.json({ error: 'Benchmark not enabled for this session' }, { status: 404 })

  if (metrics.judgeResponse) return NextResponse.json({ error: 'Judge already recorded' }, { status: 409 })

  const start = Date.now()
  const model = resolveModel(provider as RouteProvider, modelId, apiKey)
  const result = await generateText({
    model,
    system: JUDGE_SYSTEM_PROMPT,
    prompt: buildJudgePrompt(question, baselineAnswer, vadaRecommendation)
  })
  const elapsedMs = Date.now() - start

  await saveJudgeMetrics(sessionId, {
    response: result.text,
    provider,
    modelId,
    diagnosis: parseDiagnosis(result.text),
    tokensInput: result.usage?.inputTokens ?? null,
    tokensOutput: result.usage?.outputTokens ?? null,
    elapsedMs
  })

  return NextResponse.json({ ok: true })
}
