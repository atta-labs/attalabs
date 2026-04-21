// V2 Step 2 — Analysis: A0 vs B0 orchestration-alone on Haiku 4.5.
//
// Reads from v2_baseline_runs, v2_orchestration_runs, and v2_judge_results.
// Writes report to apps/vada-ai/specs/v2-results/step-2-analysis.md.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/analyze-step-2.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { corpus } from '../corpus'
import { V2_MODEL_ID, V2_JUDGE_MODEL_ID } from './config'
import { getAllV2Step2JudgeResults, getV2BaselineRunsForQuestion, getV2OrchestrationRunsForQuestion } from './db'

// Normalize diagnosis + slot assignment to canonical B0/A0 winner.
// systemADescription encodes which variant is in slot A.
function normalizeVerdict(
  diagnosis: string | null,
  systemADescription: string
): 'B0_WON' | 'A0_WON' | 'TIE' | 'NEGLIGIBLE' | 'FAILURE' | 'UNKNOWN' {
  if (!diagnosis) return 'UNKNOWN'
  const slotAIsB0 = systemADescription.startsWith('B0')
  switch (diagnosis) {
    case 'A_WON':
      return slotAIsB0 ? 'B0_WON' : 'A0_WON'
    case 'B_WON':
      return slotAIsB0 ? 'A0_WON' : 'B0_WON'
    case 'TIE':
      return 'TIE'
    case 'NEGLIGIBLE_DIFFERENCE':
      return 'NEGLIGIBLE'
    case 'PIPELINE_FAILURE':
      return 'FAILURE'
    default:
      return 'UNKNOWN'
  }
}

const corpusById = Object.fromEntries(corpus.map((q) => [q.id, q]))
const questionTextToId = Object.fromEntries(corpus.map((q) => [q.text, q.id]))

async function main() {
  const allJudgeResults = await getAllV2Step2JudgeResults()

  if (allJudgeResults.length === 0) {
    console.error('No V2 Step 2 judge results found. Run compare-a0-b0.ts first.')
    process.exit(1)
  }

  type NormalizedResult = {
    questionId: string
    verdict: ReturnType<typeof normalizeVerdict>
    diagnosis: string | null
    judgeResponse: string
    systemADescription: string
  }

  const normalized: NormalizedResult[] = allJudgeResults.map((r) => {
    const questionId = questionTextToId[r.question] ?? 'UNKNOWN'
    return {
      questionId,
      verdict: normalizeVerdict(r.diagnosis, r.systemADescription),
      diagnosis: r.diagnosis,
      judgeResponse: r.judgeResponse,
      systemADescription: r.systemADescription
    }
  })

  const counts = { B0_WON: 0, A0_WON: 0, TIE: 0, NEGLIGIBLE: 0, FAILURE: 0, UNKNOWN: 0 }
  for (const r of normalized) counts[r.verdict]++
  const total = normalized.length

  const byQuestion: Record<string, NormalizedResult[]> = {}
  for (const r of normalized) {
    byQuestion[r.questionId] ??= []
    byQuestion[r.questionId].push(r)
  }

  // Category breakdown
  const categories = ['Technical', 'Business', 'Ethical', 'Personal', 'Ambiguous'] as const
  const categoryStats: Record<string, { b0: number; a0: number; tie: number; total: number }> = {}
  for (const cat of categories) categoryStats[cat] = { b0: 0, a0: 0, tie: 0, total: 0 }
  for (const r of normalized) {
    const q = corpusById[r.questionId]
    if (!q) continue
    const s = categoryStats[q.category]
    s.total++
    if (r.verdict === 'B0_WON') s.b0++
    else if (r.verdict === 'A0_WON') s.a0++
    else s.tie++
  }

  // Variance
  let allAgreed = 0
  let atLeastOneDisagreed = 0
  for (const [, runs] of Object.entries(byQuestion)) {
    const verdicts = new Set(runs.map((r) => r.verdict))
    if (verdicts.size === 1) allAgreed++
    else atLeastOneDisagreed++
  }

  // B0 terminal state breakdown
  const terminalCounts: Record<string, number> = {}
  let b0TotalRuns = 0
  for (const question of corpus) {
    const b0Runs = await getV2OrchestrationRunsForQuestion(question.id)
    b0TotalRuns += b0Runs.length
    for (const r of b0Runs) {
      const ts = r.terminalState ?? 'UNKNOWN'
      terminalCounts[ts] = (terminalCounts[ts] ?? 0) + 1
    }
  }

  // Token economics
  let a0InTotal = 0
  let a0OutTotal = 0
  let a0Count = 0
  let judgeInTotal = 0
  let judgeOutTotal = 0

  for (const question of corpus) {
    const a0Runs = await getV2BaselineRunsForQuestion(question.id, 'A0')
    for (const r of a0Runs) {
      a0InTotal += r.tokensInput ?? 0
      a0OutTotal += r.tokensOutput ?? 0
      a0Count++
    }
  }
  for (const r of allJudgeResults) {
    judgeInTotal += r.tokensInput ?? 0
    judgeOutTotal += r.tokensOutput ?? 0
  }

  const avgA0In = a0Count > 0 ? Math.round(a0InTotal / a0Count) : 0
  const avgA0Out = a0Count > 0 ? Math.round(a0OutTotal / a0Count) : 0
  const avgJudgeIn = allJudgeResults.length > 0 ? Math.round(judgeInTotal / allJudgeResults.length) : 0
  const avgJudgeOut = allJudgeResults.length > 0 ? Math.round(judgeOutTotal / allJudgeResults.length) : 0

  const totalIn = a0InTotal + judgeInTotal
  const totalOut = a0OutTotal + judgeOutTotal
  const costEstimate = ((totalIn * 0.8 + totalOut * 4.0) / 1_000_000).toFixed(3)

  // Sample verdicts
  const b0WonSamples = normalized.filter((r) => r.verdict === 'B0_WON').slice(0, 2)
  const a0WonSamples = normalized.filter((r) => r.verdict === 'A0_WON').slice(0, 1)
  const sampleVerdicts = [...b0WonSamples, ...a0WonSamples]

  // Per-question table
  const questionRows: string[] = []
  for (const question of corpus) {
    const runs = byQuestion[question.id] ?? []
    const verdicts = runs.map((r) => r.verdict)
    const b0 = verdicts.filter((v) => v === 'B0_WON').length
    const a0 = verdicts.filter((v) => v === 'A0_WON').length
    const tie = verdicts.filter((v) => v === 'TIE' || v === 'NEGLIGIBLE').length
    const fail = verdicts.filter((v) => v === 'FAILURE' || v === 'UNKNOWN').length
    const summary = `B0:${b0} A0:${a0} tie:${tie}${fail > 0 ? ` fail:${fail}` : ''}`
    questionRows.push(`| ${question.id} | ${question.category} | ${question.difficulty} | ${summary} |`)
  }

  const terminalRows = Object.entries(terminalCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([state, n]) => `| ${state} | ${n} | ${b0TotalRuns > 0 ? ((n / b0TotalRuns) * 100).toFixed(1) : 0}% |`)
    .join('\n')

  const b0WinRate = total > 0 ? ((counts.B0_WON / total) * 100).toFixed(1) : '0'
  const a0WinRate = total > 0 ? ((counts.A0_WON / total) * 100).toFixed(1) : '0'

  let outcome: string
  if (counts.B0_WON > counts.A0_WON) {
    outcome = `B0 (Vāda on Haiku) outperformed A0 single-shot: ${counts.B0_WON}/${total} (${b0WinRate}%) vs ${counts.A0_WON}/${total} (${a0WinRate}%). Orchestration adds value even on Haiku 4.5.`
  } else if (counts.A0_WON > counts.B0_WON) {
    outcome = `A0 single-shot outperformed B0 (Vāda on Haiku): ${counts.A0_WON}/${total} (${a0WinRate}%) vs ${counts.B0_WON}/${total} (${b0WinRate}%). Orchestration overhead did not pay off on Haiku 4.5.`
  } else {
    outcome = `A0 and B0 are roughly equivalent: ${counts.A0_WON}/${total} A0 vs ${counts.B0_WON}/${total} B0. No clear advantage from orchestration on Haiku 4.5.`
  }

  const report = `# V2 Step 2 Analysis — A0 vs B0 Orchestration-Alone on Haiku 4.5

Generated: ${new Date().toISOString().slice(0, 10)}

---

## Run metadata

| Field | Value |
|---|---|
| Test model | \`${V2_MODEL_ID}\` |
| Judge model | \`${V2_JUDGE_MODEL_ID}\` |
| Corpus | ${corpus.length} questions (V2 corpus, frozen 2026-04-21) |
| Runs per config | ${b0TotalRuns > 0 ? Math.round(b0TotalRuns / corpus.length) : 'N/A'} (N=3) |
| Total A0 baseline calls | ${a0Count} |
| Total B0 orchestration runs | ${b0TotalRuns} |
| Total judge calls | ${allJudgeResults.length} |
| Position mode | standard (2:1 A0-first for N=3) |

---

## Overall results (normalized to B0 vs A0)

| Verdict | Count | % |
|---|---|---|
| B0 (Vāda) won | ${counts.B0_WON} | ${b0WinRate}% |
| A0 (single-shot) won | ${counts.A0_WON} | ${a0WinRate}% |
| Tie | ${counts.TIE} | ${total > 0 ? ((counts.TIE / total) * 100).toFixed(1) : 0}% |
| Negligible | ${counts.NEGLIGIBLE} | ${total > 0 ? ((counts.NEGLIGIBLE / total) * 100).toFixed(1) : 0}% |
| Pipeline failure | ${counts.FAILURE} | ${total > 0 ? ((counts.FAILURE / total) * 100).toFixed(1) : 0}% |
| **Total** | **${total}** | |

---

## Win rate by category

| Category | B0 won | A0 won | Tie/Neg | Total |
|---|---|---|---|---|
${categories.map((c) => `| ${c} | ${categoryStats[c].b0} | ${categoryStats[c].a0} | ${categoryStats[c].tie} | ${categoryStats[c].total} |`).join('\n')}

---

## Per-question results

| ID | Category | Difficulty | Verdicts (N=3) |
|---|---|---|---|
${questionRows.join('\n')}

---

## Variance across N=3

- Questions where all 3 runs agreed on verdict: **${allAgreed}** / ${Object.keys(byQuestion).length}
- Questions where at least 1 run disagreed: **${atLeastOneDisagreed}** / ${Object.keys(byQuestion).length}

---

## B0 terminal state breakdown

| Terminal state | Count | % |
|---|---|---|
${terminalRows}

---

## Token economics (A0 + judge only; B0 tokens counted inside Vāda sessions)

| Variant | Avg input | Avg output |
|---|---|---|
| A0 | ${avgA0In} | ${avgA0Out} |
| Judge | ${avgJudgeIn} | ${avgJudgeOut} |

Total tokens — input: ${totalIn.toLocaleString()} / output: ${totalOut.toLocaleString()}
Estimated cost (A0 + judge only): **$${costEstimate}** (Haiku pricing: ~$0.80/M input, ~$4/M output)

---

## Sample judge verdicts

${sampleVerdicts
  .map((r) => {
    const q = corpusById[r.questionId]
    const label = `${r.questionId} (${q?.category ?? '?'}) — ${r.verdict}`
    const excerpt = r.judgeResponse.slice(-400)
    return `### ${label}\n\n> ...${excerpt}`
  })
  .join('\n\n')}

---

## Outcome

${outcome}

_Interpretation pending Principal review._
`

  const outPath = join(import.meta.dir, '../../../../specs/v2-results/step-2-analysis.md')
  writeFileSync(outPath, report, 'utf-8')
  console.log(`\nReport written to: ${outPath}`)

  console.log(`\n${'═'.repeat(72)}`)
  console.log('  V2 Step 2 Summary')
  console.log('─'.repeat(72))
  console.log(`  B0 won: ${counts.B0_WON}/${total} (${b0WinRate}%)`)
  console.log(`  A0 won: ${counts.A0_WON}/${total} (${a0WinRate}%)`)
  console.log(`  Tie/Negligible: ${counts.TIE + counts.NEGLIGIBLE}/${total}`)
  console.log(`  Estimated cost (A0+judge): $${costEstimate}`)
  console.log(`${'═'.repeat(72)}\n`)
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
