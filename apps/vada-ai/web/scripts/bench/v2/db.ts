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

// Check if this exact run has already been judged.
// Keyed on (question, systemADescription, runIndex) — all three required to prevent
// same-slot dedup when multiple run indices share the same slot assignment.
export async function getExistingV2JudgeResult(questionText: string, systemADescription: string, runIndex: number) {
  const rows = await db
    .select({ id: schema.v2JudgeResults.id, diagnosis: schema.v2JudgeResults.diagnosis })
    .from(schema.v2JudgeResults)
    .where(
      and(
        eq(schema.v2JudgeResults.question, questionText),
        eq(schema.v2JudgeResults.systemADescription, systemADescription),
        eq(schema.v2JudgeResults.runIndex, runIndex)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

export async function deleteV2BaselineRunsForVariant(variant: string) {
  await db.delete(schema.v2BaselineRuns).where(eq(schema.v2BaselineRuns.variant, variant))
}

export async function deleteAllV2BaselineJudgeResults() {
  await db.delete(schema.v2JudgeResults).where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-baseline'))
}

// Fetch all V2 judge results for Step 1 analysis (comparison_type = baseline-vs-baseline).
export async function getAllV2BaselineJudgeResults() {
  return db
    .select()
    .from(schema.v2JudgeResults)
    .where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-baseline'))
    .orderBy(schema.v2JudgeResults.createdAt)
}

// ── V2 orchestration runs (B0) ────────────────────────────────────────────────

export async function insertV2OrchestrationRun(data: {
  questionId: string
  runIndex: number
  questionText: string
  sessionId: string | null
  conclusionText: string | null
  conclusionJson: unknown | null
  terminalState: string | null
  modelId: string
  provider: string
  elapsedMs: number
}) {
  const inserted = await db.insert(schema.v2OrchestrationRuns).values(data).returning()
  return inserted[0]!
}

export async function getV2OrchestrationRun(questionId: string, runIndex: number) {
  const rows = await db
    .select()
    .from(schema.v2OrchestrationRuns)
    .where(
      and(eq(schema.v2OrchestrationRuns.questionId, questionId), eq(schema.v2OrchestrationRuns.runIndex, runIndex))
    )
    .limit(1)
  return rows[0] ?? null
}

export async function getV2OrchestrationRunsForQuestion(questionId: string) {
  return db
    .select()
    .from(schema.v2OrchestrationRuns)
    .where(eq(schema.v2OrchestrationRuns.questionId, questionId))
    .orderBy(schema.v2OrchestrationRuns.runIndex)
}

export async function deleteAllV2OrchestrationRuns() {
  await db.delete(schema.v2OrchestrationRuns)
}

// Fetch all V2 judge results for Step 2 analysis (comparison_type = baseline-vs-vada).
export async function getAllV2Step2JudgeResults() {
  return db
    .select()
    .from(schema.v2JudgeResults)
    .where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-vada'))
    .orderBy(schema.v2JudgeResults.createdAt)
}

export async function deleteAllV2Step2JudgeResults() {
  await db.delete(schema.v2JudgeResults).where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-vada'))
}

// Read conclusion row directly from DB (for bench scripts using preload infra).
export async function getV2ConclusionForSession(sessionId: string) {
  const rows = await db.select().from(schema.conclusions).where(eq(schema.conclusions.sessionId, sessionId)).limit(1)
  return rows[0] ?? null
}

// ── Task 3.5 — Sonnet/Haiku isolation helpers ─────────────────────────────────

// Model-aware orchestration run lookup (for Task 3.5 Sonnet/Haiku isolation).
// getV2OrchestrationRun checks by (questionId, runIndex) only — this collides if Haiku
// and Sonnet share the same questionId+runIndex. Use this helper to filter by model.
export async function getV2OrchestrationRunForModel(questionId: string, runIndex: number, modelId: string) {
  const rows = await db
    .select()
    .from(schema.v2OrchestrationRuns)
    .where(
      and(
        eq(schema.v2OrchestrationRuns.questionId, questionId),
        eq(schema.v2OrchestrationRuns.runIndex, runIndex),
        eq(schema.v2OrchestrationRuns.modelId, modelId)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

// Fetch all orchestration runs for a specific model (e.g. all Sonnet B0S rows).
export async function getV2OrchestrationRunsForModel(modelId: string) {
  return db
    .select()
    .from(schema.v2OrchestrationRuns)
    .where(eq(schema.v2OrchestrationRuns.modelId, modelId))
    .orderBy(schema.v2OrchestrationRuns.questionId, schema.v2OrchestrationRuns.runIndex)
}

// Fetch all Step 2 judge results for Sonnet (comparison_type = baseline-vs-vada-sonnet).
export async function getAllV2Step2SonnetJudgeResults() {
  return db
    .select()
    .from(schema.v2JudgeResults)
    .where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-vada-sonnet'))
    .orderBy(schema.v2JudgeResults.createdAt)
}

// Fetch all Step 1 judge results for Sonnet (comparison_type = baseline-vs-baseline-sonnet).
export async function getAllV2BaselineSonnetJudgeResults() {
  return db
    .select()
    .from(schema.v2JudgeResults)
    .where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-baseline-sonnet'))
    .orderBy(schema.v2JudgeResults.createdAt)
}
