// DB helpers for V2 bench scripts — direct Drizzle access (no HTTP).
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function insertV2BaselineRun(data: {
  questionId: string
  variant: string
  runIndex: number
  questionText: string
  responseText: string
  parsedJson: unknown | null
  schemaValid: boolean | null
  modelId: string
  provider: string
  tokensInput: number | null
  tokensOutput: number | null
  elapsedMs: number
}) {
  const inserted = await db.insert(schema.v2BaselineRuns).values(data).returning()
  return inserted[0]!
}

export async function getV2BaselineRun(questionId: string, variant: string, runIndex: number) {
  const rows = await db
    .select()
    .from(schema.v2BaselineRuns)
    .where(
      and(
        eq(schema.v2BaselineRuns.questionId, questionId),
        eq(schema.v2BaselineRuns.variant, variant),
        eq(schema.v2BaselineRuns.runIndex, runIndex)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

export async function getV2BaselineRunsForQuestion(questionId: string, variant: string) {
  return db
    .select()
    .from(schema.v2BaselineRuns)
    .where(and(eq(schema.v2BaselineRuns.questionId, questionId), eq(schema.v2BaselineRuns.variant, variant)))
    .orderBy(schema.v2BaselineRuns.runIndex)
}

// Check if a comparison has already been judged for this exact pairing.
// Keyed on question text + systemADescription to avoid re-running.
export async function getExistingV2JudgeResult(questionText: string, systemADescription: string) {
  const rows = await db
    .select({ id: schema.v2JudgeResults.id, diagnosis: schema.v2JudgeResults.diagnosis })
    .from(schema.v2JudgeResults)
    .where(
      and(
        eq(schema.v2JudgeResults.question, questionText),
        eq(schema.v2JudgeResults.systemADescription, systemADescription)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

// Fetch all V2 judge results for Step 1 analysis (comparison_type = baseline-vs-baseline).
export async function getAllV2BaselineJudgeResults() {
  return db
    .select()
    .from(schema.v2JudgeResults)
    .where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-baseline'))
    .orderBy(schema.v2JudgeResults.createdAt)
}
