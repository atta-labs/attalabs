import { db, schema } from '@/db'

export async function saveV2JudgeResult(input: {
  sessionId?: string | null
  runIndex?: number | null
  comparisonType: string
  systemADescription: string
  systemBDescription: string
  question: string
  responseA: string
  responseB: string
  judgeResponse: string
  diagnosis: string | null
  provider: string
  modelId: string
  tokensInput: number | null
  tokensOutput: number | null
  elapsedMs: number
}) {
  const inserted = await db
    .insert(schema.v2JudgeResults)
    .values({
      sessionId: input.sessionId ?? null,
      runIndex: input.runIndex ?? null,
      comparisonType: input.comparisonType,
      systemADescription: input.systemADescription,
      systemBDescription: input.systemBDescription,
      question: input.question,
      responseA: input.responseA,
      responseB: input.responseB,
      judgeResponse: input.judgeResponse,
      diagnosis: input.diagnosis,
      provider: input.provider,
      modelId: input.modelId,
      tokensInput: input.tokensInput,
      tokensOutput: input.tokensOutput,
      elapsedMs: input.elapsedMs
    })
    .returning()
  return inserted[0]!
}
