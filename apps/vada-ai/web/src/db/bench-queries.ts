import 'server-only'
import { db } from './index'
import { benchmarkRuns, mcpSessions } from './schema'
import { desc, eq, sql, count } from 'drizzle-orm'

export async function listBenchmarkRuns(limit = 50) {
  return db
    .select({
      id: benchmarkRuns.id,
      createdAt: benchmarkRuns.createdAt,
      sessionId: benchmarkRuns.sessionId,
      questionHash: benchmarkRuns.questionHash,
      judgeModel: benchmarkRuns.judgeModel,
      judgeVerdict: benchmarkRuns.judgeVerdict,
      judgeScore: benchmarkRuns.judgeScore,
      reviewerScores: benchmarkRuns.reviewerScores,
      baselineLabel: benchmarkRuns.baselineLabel,
      runLabel: benchmarkRuns.runLabel,
      tags: benchmarkRuns.tags,
      prompt: mcpSessions.prompt,
      reviewerProfile: mcpSessions.reviewerProfile,
      sessionTitle: mcpSessions.sessionTitle,
      durationMs: mcpSessions.durationMs,
      tokensInput: mcpSessions.tokensInput,
      tokensOutput: mcpSessions.tokensOutput,
      costUsd: mcpSessions.costUsd
    })
    .from(benchmarkRuns)
    .leftJoin(mcpSessions, eq(benchmarkRuns.sessionId, mcpSessions.id))
    .orderBy(desc(benchmarkRuns.createdAt))
    .limit(limit)
}

export async function getBenchmarkRun(id: string) {
  const rows = await db
    .select({
      id: benchmarkRuns.id,
      createdAt: benchmarkRuns.createdAt,
      sessionId: benchmarkRuns.sessionId,
      questionHash: benchmarkRuns.questionHash,
      judgeModel: benchmarkRuns.judgeModel,
      judgeVerdict: benchmarkRuns.judgeVerdict,
      judgeScore: benchmarkRuns.judgeScore,
      judgeReasoning: benchmarkRuns.judgeReasoning,
      reviewerScores: benchmarkRuns.reviewerScores,
      baselineLabel: benchmarkRuns.baselineLabel,
      baselineResponse: benchmarkRuns.baselineResponse,
      runLabel: benchmarkRuns.runLabel,
      tags: benchmarkRuns.tags,
      prompt: mcpSessions.prompt,
      context: mcpSessions.context,
      response: mcpSessions.response,
      reviewerProfile: mcpSessions.reviewerProfile,
      sessionTitle: mcpSessions.sessionTitle,
      durationMs: mcpSessions.durationMs,
      tokensInput: mcpSessions.tokensInput,
      tokensOutput: mcpSessions.tokensOutput,
      costUsd: mcpSessions.costUsd
    })
    .from(benchmarkRuns)
    .leftJoin(mcpSessions, eq(benchmarkRuns.sessionId, mcpSessions.id))
    .where(eq(benchmarkRuns.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function getBenchmarkStats() {
  const [total, verdictCounts] = await Promise.all([
    db.select({ n: count() }).from(benchmarkRuns),
    db
      .select({ verdict: benchmarkRuns.judgeVerdict, n: count() })
      .from(benchmarkRuns)
      .groupBy(benchmarkRuns.judgeVerdict)
  ])

  const byVerdict = Object.fromEntries(verdictCounts.map((r) => [r.verdict, r.n]))
  const avgScore = await db.select({ avg: sql<number>`avg(judge_score)` }).from(benchmarkRuns)

  return {
    total: total[0]?.n ?? 0,
    vadaWins: byVerdict.vada_wins ?? 0,
    baselineWins: byVerdict.baseline_wins ?? 0,
    ties: byVerdict.tie ?? 0,
    avgScore: avgScore[0]?.avg ?? 0
  }
}
