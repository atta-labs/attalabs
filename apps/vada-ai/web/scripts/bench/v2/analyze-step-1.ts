// V2 Step 1 — Analysis: A0 vs A1 baseline ceiling on Haiku 4.5.
//
// Reads from v2_baseline_runs and v2_judge_results.
// Writes report to apps/vada-ai/specs/v2-results/step-1-analysis.md.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/analyze-step-1.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { corpus } from '../corpus'
import { V2_MODEL_ID, V2_JUDGE_MODEL_ID } from './config'
import { getAllV2BaselineJudgeResults, getV2BaselineRunsForQuestion } from './db'

// Normalize judge diagnosis + slot assignment to canonical A1/A0 winner.
// The system description encodes which variant is in slot A ('A0 naive...' or 'A1 rich...').
function normalizeVerdict(
  diagnosis: string | null,
  systemADescription: string
): 'A1_WON' | 'A0_WON' | 'TIE' | 'NEGLIGIBLE' | 'FAILURE' | 'UNKNOWN' {
  if (!diagnosis) return 'UNKNOWN'
  const slotAIsA1 = systemADescription.startsWith('A1')
  switch (diagnosis) {
    case 'A_WON':
      return slotAIsA1 ? 'A1_WON' : 'A0_WON'
    case 'B_WON':
      return slotAIsA1 ? 'A0_WON' : 'A1_WON'
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
  const allJudgeResults = await getAllV2BaselineJudgeResults()

  if (allJudgeResults.length === 0) {
    console.error('No V2 baseline judge results found. Run compare-a0-a1.ts first.')
    process.exit(1)
  }

  // Index judge results by question ID + run index (inferred from count per question)
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

  // Aggregate counts
  const counts = { A1_WON: 0, A0_WON: 0, TIE: 0, NEGLIGIBLE: 0, FAILURE: 0, UNKNOWN: 0 }
  for (const r of normalized) counts[r.verdict]++
  const total = normalized.length

  // Per-question results (all runs)
  const byQuestion: Record<string, NormalizedResult[]> = {}
  for (const r of normalized) {
    byQuestion[r.questionId] ??= []
    byQuestion[r.questionId].push(r)
  }

  // Category breakdown
  const categories = ['Technical', 'Business', 'Ethical', 'Personal', 'Ambiguous'] as const
  const categoryStats: Record<string, { a1: number; a0: number; tie: number; total: number }> = {}
  for (const cat of categories) {
    categoryStats[cat] = { a1: 0, a0: 0, tie: 0, total: 0 }
  }
  for (const r of normalized) {
    const q = corpusById[r.questionId]
    if (!q) continue
    const s = categoryStats[q.category]
    s.total++
    if (r.verdict === 'A1_WON') s.a1++
    else if (r.verdict === 'A0_WON') s.a0++
    else s.tie++
  }

  // Variance: how many questions had all runs agree?
  let allAgreed = 0
  let atLeastOneDisagreed = 0
  for (const [, runs] of Object.entries(byQuestion)) {
    const verdicts = new Set(runs.map((r) => r.verdict))
    if (verdicts.size === 1) allAgreed++
    else atLeastOneDisagreed++
  }

  // A1 JSON parse rate from v2_baseline_runs
  let a1TotalRuns = 0
  let a1ValidJson = 0
  const refusals: string[] = []
  for (const question of corpus) {
    const a1Runs = await getV2BaselineRunsForQuestion(question.id, 'A1')
    for (const run of a1Runs) {
      a1TotalRuns++
      if (run.parsedJson !== null) a1ValidJson++
      // Detect refusals: very short output or contains refusal language
      if (run.responseText.length < 50 || run.responseText.toLowerCase().includes("i can't")) {
        refusals.push(`${question.id} run ${run.runIndex}: "${run.responseText.slice(0, 100)}"`)
      }
    }
  }

  // Token economics
  let a0InTotal = 0
  let a0OutTotal = 0
  let a0Count = 0
  let a1InTotal = 0
  let a1OutTotal = 0
  let a1Count = 0
  let judgeInTotal = 0
  let judgeOutTotal = 0
  for (const question of corpus) {
    const a0Runs = await getV2BaselineRunsForQuestion(question.id, 'A0')
    const a1Runs = await getV2BaselineRunsForQuestion(question.id, 'A1')
    for (const r of a0Runs) {
      a0InTotal += r.tokensInput ?? 0
      a0OutTotal += r.tokensOutput ?? 0
      a0Count++
    }
    for (const r of a1Runs) {
      a1InTotal += r.tokensInput ?? 0
      a1OutTotal += r.tokensOutput ?? 0
      a1Count++
    }
  }
  for (const r of allJudgeResults) {
    judgeInTotal += r.tokensInput ?? 0
    judgeOutTotal += r.tokensOutput ?? 0
  }

  const avgA0In = a0Count > 0 ? Math.round(a0InTotal / a0Count) : 0
  const avgA0Out = a0Count > 0 ? Math.round(a0OutTotal / a0Count) : 0
  const avgA1In = a1Count > 0 ? Math.round(a1InTotal / a1Count) : 0
  const avgA1Out = a1Count > 0 ? Math.round(a1OutTotal / a1Count) : 0
  const avgJudgeIn = allJudgeResults.length > 0 ? Math.round(judgeInTotal / allJudgeResults.length) : 0
  const avgJudgeOut = allJudgeResults.length > 0 ? Math.round(judgeOutTotal / allJudgeResults.length) : 0

  // Cost estimate (Haiku 4.5: ~$0.80/M input, ~$4/M output — approximate)
  const totalIn = a0InTotal + a1InTotal + judgeInTotal
  const totalOut = a0OutTotal + a1OutTotal + judgeOutTotal
  const costEstimate = ((totalIn * 0.8 + totalOut * 4.0) / 1_000_000).toFixed(3)

  // Sample judge verdicts (pick 2-3 representative ones)
  const a1WonSamples = normalized.filter((r) => r.verdict === 'A1_WON').slice(0, 2)
  const a0WonSamples = normalized.filter((r) => r.verdict === 'A0_WON').slice(0, 1)
  const sampleVerdicts = [...a1WonSamples, ...a0WonSamples]

  // Build per-question table
  const questionRows: string[] = []
  for (const question of corpus) {
    const runs = byQuestion[question.id] ?? []
    const verdicts = runs.map((r) => r.verdict)
    const a1 = verdicts.filter((v) => v === 'A1_WON').length
    const a0 = verdicts.filter((v) => v === 'A0_WON').length
    const tie = verdicts.filter((v) => v === 'TIE' || v === 'NEGLIGIBLE').length
    const fail = verdicts.filter((v) => v === 'FAILURE' || v === 'UNKNOWN').length
    const summary = `A1:${a1} A0:${a0} tie:${tie}${fail > 0 ? ` fail:${fail}` : ''}`
    questionRows.push(`| ${question.id} | ${question.category} | ${question.difficulty} | ${summary} |`)
  }

  // Compose markdown report
  const report = `# V2 Step 1 Analysis — A0 vs A1 Baseline Ceiling on Haiku 4.5

Generated: ${new Date().toISOString().slice(0, 10)}

---

## Run metadata

| Field | Value |
|---|---|
| Test model | \`${V2_MODEL_ID}\` |
| Judge model | \`${V2_JUDGE_MODEL_ID}\` |
| Corpus | ${corpus.length} questions (V2 corpus, frozen 2026-04-21) |
| Runs per variant | ${a0Count / corpus.length} (N=${a0Count / corpus.length}) |
| Total baseline calls | ${a0Count + a1Count} (${a0Count} A0 + ${a1Count} A1) |
| Total judge calls | ${allJudgeResults.length} |
| Position mode | standard (2:1 A0-first for N=3) |

---

## Overall results (normalized to A1 vs A0)

| Verdict | Count | % |
|---|---|---|
| A1 won | ${counts.A1_WON} | ${((counts.A1_WON / total) * 100).toFixed(1)}% |
| A0 won | ${counts.A0_WON} | ${((counts.A0_WON / total) * 100).toFixed(1)}% |
| Tie | ${counts.TIE} | ${((counts.TIE / total) * 100).toFixed(1)}% |
| Negligible | ${counts.NEGLIGIBLE} | ${((counts.NEGLIGIBLE / total) * 100).toFixed(1)}% |
| Pipeline failure | ${counts.FAILURE} | ${((counts.FAILURE / total) * 100).toFixed(1)}% |
| **Total** | **${total}** | |

---

## Win rate by category

| Category | A1 won | A0 won | Tie/Neg | Total |
|---|---|---|---|---|
${categories.map((c) => `| ${c} | ${categoryStats[c].a1} | ${categoryStats[c].a0} | ${categoryStats[c].tie} | ${categoryStats[c].total} |`).join('\n')}

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

## Haiku compliance

- A1 outputs that parsed as valid JSON: **${a1ValidJson} / ${a1TotalRuns}** (${a1TotalRuns > 0 ? ((a1ValidJson / a1TotalRuns) * 100).toFixed(1) : 'N/A'}%)
- A0 outputs (no JSON parsing expected): ${a0Count} (N/A)
- Refusals or truncations detected: ${refusals.length > 0 ? refusals.join('\n  ') : 'none'}

---

## Token economics

| Variant | Avg input | Avg output |
|---|---|---|
| A0 | ${avgA0In} | ${avgA0Out} |
| A1 | ${avgA1In} | ${avgA1Out} |
| Judge | ${avgJudgeIn} | ${avgJudgeOut} |

Total tokens — input: ${totalIn.toLocaleString()} / output: ${totalOut.toLocaleString()}
Estimated cost: **$${costEstimate}** (Haiku pricing: ~$0.80/M input, ~$4/M output)

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

_Interpretation pending Principal review._

A1 won ${counts.A1_WON} / ${total} comparisons (${((counts.A1_WON / total) * 100).toFixed(1)}%) vs A0's ${counts.A0_WON} (${((counts.A0_WON / total) * 100).toFixed(1)}%).
${counts.A1_WON > counts.A0_WON ? 'A1 is the stronger baseline and will serve as the primary comparator for Step 4 (A1 vs B1).' : counts.A0_WON > counts.A1_WON ? 'A0 outperformed A1 — rich prompting did not improve over naive for Haiku 4.5. Flag before proceeding.' : 'A1 and A0 are roughly equivalent — rich prompting produced no improvement over naive for Haiku 4.5.'}
`

  const outPath = join(import.meta.dir, '../../../../specs/v2-results/step-1-analysis.md')
  writeFileSync(outPath, report, 'utf-8')
  console.log(`\nReport written to: ${outPath}`)

  // Console summary
  console.log(`\n${'═'.repeat(72)}`)
  console.log('  V2 Step 1 Summary')
  console.log('─'.repeat(72))
  console.log(`  A1 won: ${counts.A1_WON}/${total} (${((counts.A1_WON / total) * 100).toFixed(1)}%)`)
  console.log(`  A0 won: ${counts.A0_WON}/${total} (${((counts.A0_WON / total) * 100).toFixed(1)}%)`)
  console.log(`  Tie/Negligible: ${counts.TIE + counts.NEGLIGIBLE}/${total}`)
  console.log(`  A1 JSON parse rate: ${a1ValidJson}/${a1TotalRuns}`)
  console.log(`  Estimated cost: $${costEstimate}`)
  console.log(`${'═'.repeat(72)}\n`)
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
