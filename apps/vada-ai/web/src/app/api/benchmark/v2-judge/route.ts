// V2 neutral judge — for intra-variant comparisons (baseline-vs-baseline, vada-vs-vada).
// For baseline-vs-vada comparisons, use the V1 locked judge at /api/benchmark/judge.
// V1 judge is locked — do not modify. See memory: feedback_judge_prompt_locked.md.
import 'server-only'
import { auth } from '@atta/auth/hooks'
import type { VendorId } from '@atta/models'
import { resolveModel } from '@atta/models/server'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrCreateUser, getSessionForUser } from '@/db/queries'
import { saveV2JudgeResult } from '@/db/queries/v2-judge'

export const maxDuration = 120

const Schema = z.object({
  sessionId: z.string().nullable().optional(),
  runIndex: z.number().int().nullable().optional(),
  question: z.string().min(1),
  responseA: z.string().min(1),
  responseB: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  apiKey: z.string(),
  systemADescription: z.string().min(1),
  systemBDescription: z.string().min(1),
  comparisonType: z.enum([
    'baseline-vs-baseline',
    'baseline-vs-baseline-sonnet',
    'vada-vs-vada',
    'baseline-vs-vada',
    'baseline-vs-vada-sonnet',
    'rich-baseline-vs-vada-sonnet',
    'other'
  ])
})

const JUDGE_PROMPT_BODY = `Compare the two responses on: decisiveness, depth, accuracy, usefulness. Identify where one response added genuine value over the other and where it added noise or repetition. Be specific — quote short passages when making a point. Conclude with a one-line verdict: which response would you recommend the Principal act on, and why. Keep your full response to about 100 lines of markdown.

After your markdown response, on a final separate line, output exactly: \`DIAGNOSIS: <CATEGORY> — <one-sentence reason>\` where CATEGORY is one of:
- A_WON (Response A is meaningfully better than Response B)
- B_WON (Response B is meaningfully better than Response A)
- TIE (both responses are roughly equivalent)
- NEGLIGIBLE_DIFFERENCE (both responses converged on the same conclusion with no meaningful difference in quality)
- PIPELINE_FAILURE (one or both responses are corrupted, truncated, or contain unsupported claims)`

function buildSystemPrompt(systemA: string, systemB: string): string {
  return `You are an impartial judge. You are given:
1. A question from the Principal.
2. Response A, produced by ${systemA}.
3. Response B, produced by ${systemB}.

${JUDGE_PROMPT_BODY}`
}

function buildJudgePrompt(
  question: string,
  responseA: string,
  responseB: string,
  systemA: string,
  systemB: string
): string {
  return `## Question\n\n${question.trim()}\n\n## Response A (${systemA})\n\n${responseA.trim()}\n\n## Response B (${systemB})\n\n${responseB.trim()}`
}

const DIAGNOSIS_PATTERN = /DIAGNOSIS:\s*(A_WON|B_WON|TIE|NEGLIGIBLE_DIFFERENCE|PIPELINE_FAILURE)\b/i

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

  const {
    sessionId,
    runIndex,
    question,
    responseA,
    responseB,
    provider,
    modelId,
    apiKey,
    systemADescription,
    systemBDescription,
    comparisonType
  } = parsed.data

  // If a sessionId is provided, validate it belongs to the authenticated user.
  // Bench scripts that run without sessions pass sessionId: null — skip validation.
  if (sessionId) {
    await getOrCreateUser(clerkId, '')
    const session = await getSessionForUser(sessionId, clerkId)
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 403 })
  }

  const start = Date.now()
  const model = resolveModel(provider as VendorId, modelId, apiKey)
  const result = await generateText({
    model,
    system: buildSystemPrompt(systemADescription, systemBDescription),
    prompt: buildJudgePrompt(question, responseA, responseB, systemADescription, systemBDescription)
  })
  const elapsedMs = Date.now() - start

  const diagnosis = parseDiagnosis(result.text)

  await saveV2JudgeResult({
    sessionId: sessionId ?? null,
    runIndex: runIndex ?? null,
    comparisonType,
    systemADescription,
    systemBDescription,
    question,
    responseA,
    responseB,
    judgeResponse: result.text,
    diagnosis,
    provider,
    modelId,
    tokensInput: result.usage?.inputTokens ?? null,
    tokensOutput: result.usage?.outputTokens ?? null,
    elapsedMs
  })

  return NextResponse.json({ ok: true, diagnosis })
}
