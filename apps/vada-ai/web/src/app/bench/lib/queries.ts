import { count, desc, eq, sql } from 'drizzle-orm'
import { db, schema } from '@/db'
import { computeCost } from './pricing'

// ── Types ─────────────────────────────────────────────────────────────────────

export type V1BenchRow = {
  sessionId: string
  question: string
  terminalState: string | null
  modelId: string | null
  provider: string | null
  createdAt: Date
  baselineAnswer: string | null
  baselineModelId: string | null
  baselineTokensInput: number | null
  baselineTokensOutput: number | null
  baselineElapsedMs: number | null
  judgeResponse: string | null
  judgeDiagnosis: string | null
  judgeModelId: string | null
  judgeTokensInput: number | null
  judgeTokensOutput: number | null
  judgeElapsedMs: number | null
  deliberationTokensInput: number
  deliberationTokensOutput: number
  deliberationSumElapsedMs: number
  deliberationCallCount: number
  totalCost: number
}

export type V2BaselineRow = typeof schema.v2BaselineRuns.$inferSelect
export type V2OrchestrationRow = typeof schema.v2OrchestrationRuns.$inferSelect
export type V2JudgeRow = typeof schema.v2JudgeResults.$inferSelect
export type SessionRow = typeof schema.sessions.$inferSelect

export type V1Summary = {
  total: number
  diagnosisCounts: Record<string, number>
  dateRange: { min: Date | null; max: Date | null }
}

export type V2TaskSummary = {
  comparisonType: string
  totalJudgements: number
  diagnosisCounts: Record<string, number>
  models: string[]
}

export type OverviewStats = {
  totalV1Sessions: number
  totalV2BaselineRuns: number
  totalV2OrchestrationRuns: number
  totalV2JudgeResults: number
  dateRange: { min: Date | null; max: Date | null }
  models: string[]
}

export type RecentSessionEntry = {
  id: string
  type: 'v1' | 'v2-baseline' | 'v2-orchestration'
  questionId: string | null
  question: string
  variant: string | null
  model: string | null
  terminalState: string | null
  diagnosis: string | null
  createdAt: Date
}

// ── Overview ──────────────────────────────────────────────────────────────────

export async function getOverviewStats(): Promise<OverviewStats> {
  const [v1Count, baselineCount, orchCount, judgeCount] = await Promise.all([
    db.select({ count: count() }).from(schema.benchmarkMetrics),
    db.select({ count: count() }).from(schema.v2BaselineRuns),
    db.select({ count: count() }).from(schema.v2OrchestrationRuns),
    db.select({ count: count() }).from(schema.v2JudgeResults),
  ])

  const [dateResult] = await db.select({
    minDate: sql<string>`min(created_at)`,
    maxDate: sql<string>`max(created_at)`,
  }).from(schema.benchmarkMetrics)

  const modelRows = await db
    .selectDistinct({ modelId: schema.v2BaselineRuns.modelId })
    .from(schema.v2BaselineRuns)
  const orchModelRows = await db
    .selectDistinct({ modelId: schema.v2OrchestrationRuns.modelId })
    .from(schema.v2OrchestrationRuns)
  const models = [...new Set([...modelRows.map((r) => r.modelId), ...orchModelRows.map((r) => r.modelId)])]

  return {
    totalV1Sessions: Number(v1Count[0]?.count ?? 0),
    totalV2BaselineRuns: Number(baselineCount[0]?.count ?? 0),
    totalV2OrchestrationRuns: Number(orchCount[0]?.count ?? 0),
    totalV2JudgeResults: Number(judgeCount[0]?.count ?? 0),
    dateRange: {
      min: dateResult?.minDate ? new Date(dateResult.minDate) : null,
      max: dateResult?.maxDate ? new Date(dateResult.maxDate) : null,
    },
    models,
  }
}

export async function getTotalCost(): Promise<number> {
  const baselineRuns = await db
    .select({
      modelId: schema.v2BaselineRuns.modelId,
      tokensInput: schema.v2BaselineRuns.tokensInput,
      tokensOutput: schema.v2BaselineRuns.tokensOutput,
    })
    .from(schema.v2BaselineRuns)
  const orchRuns = await db
    .select({
      modelId: schema.v2OrchestrationRuns.modelId,
    })
    .from(schema.v2OrchestrationRuns)
  const judgeRuns = await db
    .select({
      modelId: schema.v2JudgeResults.modelId,
      tokensInput: schema.v2JudgeResults.tokensInput,
      tokensOutput: schema.v2JudgeResults.tokensOutput,
    })
    .from(schema.v2JudgeResults)
  const v1Metrics = await db
    .select({
      baselineModelId: schema.benchmarkMetrics.baselineModelId,
      baselineTokensInput: schema.benchmarkMetrics.baselineTokensInput,
      baselineTokensOutput: schema.benchmarkMetrics.baselineTokensOutput,
      judgeModelId: schema.benchmarkMetrics.judgeModelId,
      judgeTokensInput: schema.benchmarkMetrics.judgeTokensInput,
      judgeTokensOutput: schema.benchmarkMetrics.judgeTokensOutput,
      deliberationTokensInput: schema.benchmarkMetrics.deliberationTokensInput,
      deliberationTokensOutput: schema.benchmarkMetrics.deliberationTokensOutput,
    })
    .from(schema.benchmarkMetrics)

  let total = 0
  for (const r of baselineRuns) total += computeCost(r.modelId, r.tokensInput, r.tokensOutput)
  for (const r of judgeRuns) total += computeCost(r.modelId, r.tokensInput, r.tokensOutput)
  for (const r of v1Metrics) {
    total += computeCost(r.baselineModelId, r.baselineTokensInput, r.baselineTokensOutput)
    total += computeCost(r.judgeModelId, r.judgeTokensInput, r.judgeTokensOutput)
    total += computeCost(null, r.deliberationTokensInput, r.deliberationTokensOutput)
  }
  // Orchestration runs don't store tokens directly — omit from total
  void orchRuns
  return total
}

// ── V1 bench ──────────────────────────────────────────────────────────────────

export async function getV1BenchSummary(): Promise<V1Summary> {
  const rows = await db
    .select({
      judgeDiagnosis: schema.benchmarkMetrics.judgeDiagnosis,
      createdAt: schema.benchmarkMetrics.createdAt,
    })
    .from(schema.benchmarkMetrics)

  const diagnosisCounts: Record<string, number> = {}
  let min: Date | null = null
  let max: Date | null = null
  for (const r of rows) {
    const d = r.judgeDiagnosis ?? 'UNJUDGED'
    diagnosisCounts[d] = (diagnosisCounts[d] ?? 0) + 1
    if (!min || r.createdAt < min) min = r.createdAt
    if (!max || r.createdAt > max) max = r.createdAt
  }
  return { total: rows.length, diagnosisCounts, dateRange: { min, max } }
}

export async function getV1BenchRows(): Promise<V1BenchRow[]> {
  const rows = await db
    .select({
      sessionId: schema.benchmarkMetrics.sessionId,
      question: schema.sessions.question,
      terminalState: schema.sessions.terminalState,
      modelId: schema.sessions.modelId,
      provider: schema.sessions.provider,
      createdAt: schema.benchmarkMetrics.createdAt,
      baselineAnswer: schema.benchmarkMetrics.baselineAnswer,
      baselineModelId: schema.benchmarkMetrics.baselineModelId,
      baselineTokensInput: schema.benchmarkMetrics.baselineTokensInput,
      baselineTokensOutput: schema.benchmarkMetrics.baselineTokensOutput,
      baselineElapsedMs: schema.benchmarkMetrics.baselineElapsedMs,
      judgeResponse: schema.benchmarkMetrics.judgeResponse,
      judgeDiagnosis: schema.benchmarkMetrics.judgeDiagnosis,
      judgeModelId: schema.benchmarkMetrics.judgeModelId,
      judgeTokensInput: schema.benchmarkMetrics.judgeTokensInput,
      judgeTokensOutput: schema.benchmarkMetrics.judgeTokensOutput,
      judgeElapsedMs: schema.benchmarkMetrics.judgeElapsedMs,
      deliberationTokensInput: schema.benchmarkMetrics.deliberationTokensInput,
      deliberationTokensOutput: schema.benchmarkMetrics.deliberationTokensOutput,
      deliberationSumElapsedMs: schema.benchmarkMetrics.deliberationSumElapsedMs,
      deliberationCallCount: schema.benchmarkMetrics.deliberationCallCount,
    })
    .from(schema.benchmarkMetrics)
    .innerJoin(schema.sessions, eq(schema.sessions.id, schema.benchmarkMetrics.sessionId))
    .orderBy(desc(schema.benchmarkMetrics.createdAt))

  return rows.map((r) => ({
    ...r,
    terminalState: r.terminalState ?? null,
    totalCost:
      computeCost(r.baselineModelId, r.baselineTokensInput, r.baselineTokensOutput) +
      computeCost(r.judgeModelId, r.judgeTokensInput, r.judgeTokensOutput) +
      computeCost(r.modelId, r.deliberationTokensInput, r.deliberationTokensOutput),
  }))
}

// ── V2 Task 2 — A0 vs A1 baseline ceiling ────────────────────────────────────

export async function getV2Task2Data() {
  const [baselineRuns, judgeResults] = await Promise.all([
    db
      .select()
      .from(schema.v2BaselineRuns)
      .where(
        sql`${schema.v2BaselineRuns.variant} in ('A0', 'A1') and ${schema.v2BaselineRuns.modelId} = 'claude-haiku-4-5-20251001'`
      )
      .orderBy(schema.v2BaselineRuns.questionId, schema.v2BaselineRuns.variant, schema.v2BaselineRuns.runIndex),
    db
      .select()
      .from(schema.v2JudgeResults)
      .where(sql`${schema.v2JudgeResults.comparisonType} = 'baseline-vs-baseline'`)
      .orderBy(schema.v2JudgeResults.createdAt),
  ])
  return { baselineRuns, judgeResults }
}

// ── V2 Task 3 — A0 vs B0 orchestration (Haiku) ───────────────────────────────

export async function getV2Task3Data() {
  const [orchRuns, judgeResults] = await Promise.all([
    db
      .select()
      .from(schema.v2OrchestrationRuns)
      .where(sql`${schema.v2OrchestrationRuns.modelId} = 'claude-haiku-4-5-20251001'`)
      .orderBy(schema.v2OrchestrationRuns.questionId, schema.v2OrchestrationRuns.runIndex),
    db
      .select()
      .from(schema.v2JudgeResults)
      .where(sql`${schema.v2JudgeResults.comparisonType} = 'baseline-vs-vada'`)
      .orderBy(schema.v2JudgeResults.createdAt),
  ])
  return { orchRuns, judgeResults }
}

// ── V2 Task 3.5 — Sonnet replication ─────────────────────────────────────────

export async function getV2Task3_5Data() {
  const [haikuOrcRuns, sonnetOrcRuns, haikuJudge, sonnetJudge, sonnetBaselineRuns, sonnetBaselineJudge] =
    await Promise.all([
      db
        .select()
        .from(schema.v2OrchestrationRuns)
        .where(sql`${schema.v2OrchestrationRuns.modelId} = 'claude-haiku-4-5-20251001'`)
        .orderBy(schema.v2OrchestrationRuns.questionId, schema.v2OrchestrationRuns.runIndex),
      db
        .select()
        .from(schema.v2OrchestrationRuns)
        .where(sql`${schema.v2OrchestrationRuns.modelId} = 'claude-sonnet-4-6'`)
        .orderBy(schema.v2OrchestrationRuns.questionId, schema.v2OrchestrationRuns.runIndex),
      db
        .select()
        .from(schema.v2JudgeResults)
        .where(sql`${schema.v2JudgeResults.comparisonType} = 'baseline-vs-vada'`)
        .orderBy(schema.v2JudgeResults.createdAt),
      db
        .select()
        .from(schema.v2JudgeResults)
        .where(sql`${schema.v2JudgeResults.comparisonType} = 'baseline-vs-vada-sonnet'`)
        .orderBy(schema.v2JudgeResults.createdAt),
      db
        .select()
        .from(schema.v2BaselineRuns)
        .where(
          sql`${schema.v2BaselineRuns.variant} in ('A0S', 'A1S') and ${schema.v2BaselineRuns.modelId} = 'claude-sonnet-4-6'`
        )
        .orderBy(schema.v2BaselineRuns.questionId, schema.v2BaselineRuns.variant, schema.v2BaselineRuns.runIndex),
      db
        .select()
        .from(schema.v2JudgeResults)
        .where(sql`${schema.v2JudgeResults.comparisonType} = 'baseline-vs-baseline-sonnet'`)
        .orderBy(schema.v2JudgeResults.createdAt),
    ])
  return { haikuOrcRuns, sonnetOrcRuns, haikuJudge, sonnetJudge, sonnetBaselineRuns, sonnetBaselineJudge }
}

// ── Recent sessions ───────────────────────────────────────────────────────────

export async function getRecentSessions(limit = 20): Promise<RecentSessionEntry[]> {
  const [v1Rows, baselineRows, orchRows] = await Promise.all([
    db
      .select({
        id: schema.benchmarkMetrics.sessionId,
        question: schema.sessions.question,
        modelId: schema.sessions.modelId,
        terminalState: schema.sessions.terminalState,
        judgeDiagnosis: schema.benchmarkMetrics.judgeDiagnosis,
        createdAt: schema.benchmarkMetrics.createdAt,
      })
      .from(schema.benchmarkMetrics)
      .innerJoin(schema.sessions, eq(schema.sessions.id, schema.benchmarkMetrics.sessionId))
      .orderBy(desc(schema.benchmarkMetrics.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.v2BaselineRuns)
      .orderBy(desc(schema.v2BaselineRuns.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.v2OrchestrationRuns)
      .orderBy(desc(schema.v2OrchestrationRuns.createdAt))
      .limit(limit),
  ])

  const all: RecentSessionEntry[] = [
    ...v1Rows.map((r) => ({
      id: r.id,
      type: 'v1' as const,
      questionId: null,
      question: r.question,
      variant: null,
      model: r.modelId,
      terminalState: r.terminalState ?? null,
      diagnosis: r.judgeDiagnosis ?? null,
      createdAt: r.createdAt,
    })),
    ...baselineRows.map((r) => ({
      id: r.id,
      type: 'v2-baseline' as const,
      questionId: r.questionId,
      question: r.questionText,
      variant: r.variant,
      model: r.modelId,
      terminalState: null,
      diagnosis: null,
      createdAt: r.createdAt ?? new Date(0),
    })),
    ...orchRows.map((r) => ({
      id: r.id,
      type: 'v2-orchestration' as const,
      questionId: r.questionId,
      question: r.questionText,
      variant: 'B0',
      model: r.modelId,
      terminalState: r.terminalState ?? null,
      diagnosis: null,
      createdAt: r.createdAt ?? new Date(0),
    })),
  ]

  return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
}
