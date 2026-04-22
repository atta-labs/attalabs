// V2 Step 3.5 Part 1 — Analysis: A0S vs A1S baseline ceiling on Sonnet 4.6.
//
// Reads from v2_baseline_runs and v2_judge_results (comparison_type = baseline-vs-baseline-sonnet).
// Writes report to apps/vada-ai/specs/v2-results/step-1-analysis-sonnet.md.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/analyze-step-1-sonnet.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { corpus } from '../corpus'
import { V2S_MODEL_ID, V2S_JUDGE_MODEL_ID } from './config-sonnet'
import { getAllV2BaselineSonnetJudgeResults, getV2BaselineRunsForQuestion } from './db'

function normalizeVerdict(
  diagnosis: string | null,
  systemADescription: string
): 'A1S_WON' | 'A0S_WON' | 'TIE' | 'NEGLIGIBLE' | 'FAILURE' | 'UNKNOWN' {
  if (!diagnosis) return 'UNKNOWN'
  const slotAIsA1S = systemADescription.startsWith('A1S')
  switch (diagnosis) {
    case 'A_WON':
      return slotAIsA1S ? 'A1S_WON' : 'A0S_WON'
    case 'B_WON':
      return slotAIsA1S ? 'A0S_WON' : 'A1S_WON'
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
  const allJudgeResults = await getAllV2BaselineSonnetJudgeResults()

  if (allJudgeResults.length === 0) {
    console.error('No V2 Sonnet baseline judge results found. Run compare-baselines-sonnet.ts first.')
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

  const counts = { A1S_WON: 0, A0S_WON: 0, TIE: 0, NEGLIGIBLE: 0, FAILURE: 0, UNKNOWN: 0 }
  for (const r of normalized) counts[r.verdict]++
  const total = normalized.length

  const byQuestion: Record<string, NormalizedResult[]> = {}
  for (const r of normalized) {
    byQuestion[r.questionId] ??= []
    byQuestion[r.questionId].push(r)
  }

  const categories = ['Technical', 'Business', 'Ethical', 'Personal', 'Ambiguous'] as const
  const categoryStats: Record<string, { a1s: number; a0s: number; tie: number; total: number }> = {}
  for (const cat of categories) categoryStats[cat] = { a1s: 0, a0s: 0, tie: 0, total: 0 }
  for (const r of normalized) {
    const q = corpusById[r.questionId]
    if (!q) continue
    const s = categoryStats[q.category]
    s.total++
    if (r.verdict === 'A1S_WON') s.a1s++
    else if (r.verdict === 'A0S_WON') s.a0s++
    else s.tie++
  }

  let allAgreed = 0
  let atLeastOneDisagreed = 0
  for (const [, runs] of Object.entries(byQuestion)) {
    const verdicts = new Set(runs.map((r) => r.verdict))
    if (verdicts.size === 1) allAgreed++
    else atLeastOneDisagreed++
  }

  let a1sTotalRuns = 0
  let a1sValidJson = 0
  const refusals: string[] = []
  for (const question of corpus) {
    const a1sRuns = await getV2BaselineRunsForQuestion(question.id, 'A1S')
    for (const run of a1sRuns) {
      a1sTotalRuns++
      if (run.parsedJson !== null) a1sValidJson++
      if (run.responseText.length < 50 || run.responseText.toLowerCase().includes("i can't")) {
        refusals.push(`${question.id} run ${run.runIndex}: "${run.responseText.slice(0, 100)}"`)
      }
    }
  }

  let a0sInTotal = 0
  let a0sOutTotal = 0
  let a0sCount = 0
  let a1sInTotal = 0
  let a1sOutTotal = 0
  let a1sCount = 0
  let judgeInTotal = 0
  let judgeOutTotal = 0
  for (const question of corpus) {
    const a0sRuns = await getV2BaselineRunsForQuestion(question.id, 'A0S')
    const a1sRuns = await getV2BaselineRunsForQuestion(question.id, 'A1S')
    for (const r of a0sRuns) {
      a0sInTotal += r.tokensInput ?? 0
      a0sOutTotal += r.tokensOutput ?? 0
      a0sCount++
    }
    for (const r of a1sRuns) {
      a1sInTotal += r.tokensInput ?? 0
      a1sOutTotal += r.tokensOutput ?? 0
      a1sCount++
    }
  }
  for (const r of allJudgeResults) {
    judgeInTotal += r.tokensInput ?? 0
    judgeOutTotal += r.tokensOutput ?? 0
  }

  const avgA0sIn = a0sCount > 0 ? Math.round(a0sInTotal / a0sCount) : 0
  const avgA0sOut = a0sCount > 0 ? Math.round(a0sOutTotal / a0sCount) : 0
  const avgA1sIn = a1sCount > 0 ? Math.round(a1sInTotal / a1sCount) : 0
  const avgA1sOut = a1sCount > 0 ? Math.round(a1sOutTotal / a1sCount) : 0
  const avgJudgeIn = allJudgeResults.length > 0 ? Math.round(judgeInTotal / allJudgeResults.length) : 0
  const avgJudgeOut = allJudgeResults.length > 0 ? Math.round(judgeOutTotal / allJudgeResults.length) : 0

  // Sonnet 4.6 pricing: ~$3/M input, ~$15/M output
  const totalIn = a0sInTotal + a1sInTotal + judgeInTotal
  const totalOut = a0sOutTotal + a1sOutTotal + judgeOutTotal
  const costEstimate = ((totalIn * 3.0 + totalOut * 15.0) / 1_000_000).toFixed(3)

  const a1sWonSamples = normalized.filter((r) => r.verdict === 'A1S_WON').slice(0, 2)
  const a0sWonSamples = normalized.filter((r) => r.verdict === 'A0S_WON').slice(0, 1)
  const sampleVerdicts = [...a1sWonSamples, ...a0sWonSamples]

  const questionRows: string[] = []
  for (const question of corpus) {
    const runs = byQuestion[question.id] ?? []
    const verdicts = runs.map((r) => r.verdict)
    const a1s = verdicts.filter((v) => v === 'A1S_WON').length
    const a0s = verdicts.filter((v) => v === 'A0S_WON').length
    const tie = verdicts.filter((v) => v === 'TIE' || v === 'NEGLIGIBLE').length
    const fail = verdicts.filter((v) => v === 'FAILURE' || v === 'UNKNOWN').length
    const summary = `A1S:${a1s} A0S:${a0s} tie:${tie}${fail > 0 ? ` fail:${fail}` : ''}`
    questionRows.push(`| ${question.id} | ${question.category} | ${question.difficulty} | ${summary} |`)
  }

  const report = `# V2 Step 3.5 Part 1 Analysis — A0S vs A1S Baseline Ceiling on Sonnet 4.6

Generated: ${new Date().toISOString().slice(0, 10)}

---

## Run metadata

| Field | Value |
|---|---|
| Test model | \`${V2S_MODEL_ID}\` |
| Judge model | \`${V2S_JUDGE_MODEL_ID}\` |
| Corpus | ${corpus.length} questions (V2 corpus, frozen 2026-04-21) |
| Runs per variant | 3 (N=3) |
| Total baseline calls | ${a0sCount + a1sCount} (${a0sCount} A0S + ${a1sCount} A1S) |
| Total judge calls | ${allJudgeResults.length} |
| Position mode | standard (2:1 A0S-first for N=3) |

---

## Overall results (normalized to A1S vs A0S)

| Verdict | Count | % |
|---|---|---|
| A1S won | ${counts.A1S_WON} | ${((counts.A1S_WON / total) * 100).toFixed(1)}% |
| A0S won | ${counts.A0S_WON} | ${((counts.A0S_WON / total) * 100).toFixed(1)}% |
| Tie | ${counts.TIE} | ${((counts.TIE / total) * 100).toFixed(1)}% |
| Negligible | ${counts.NEGLIGIBLE} | ${((counts.NEGLIGIBLE / total) * 100).toFixed(1)}% |
| Pipeline failure | ${counts.FAILURE} | ${((counts.FAILURE / total) * 100).toFixed(1)}% |
| **Total** | **${total}** | |

---

## Win rate by category

| Category | A1S won | A0S won | Tie/Neg | Total |
|---|---|---|---|---|
${categories.map((c) => `| ${c} | ${categoryStats[c].a1s} | ${categoryStats[c].a0s} | ${categoryStats[c].tie} | ${categoryStats[c].total} |`).join('\n')}

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

## Sonnet compliance

- A1S outputs that parsed as valid JSON: **${a1sValidJson} / ${a1sTotalRuns}** (${a1sTotalRuns > 0 ? ((a1sValidJson / a1sTotalRuns) * 100).toFixed(1) : 'N/A'}%)
- A0S outputs (no JSON parsing expected): ${a0sCount} (N/A)
- Refusals or truncations detected: ${refusals.length > 0 ? refusals.join('\n  ') : 'none'}

---

## Token economics

| Variant | Avg input | Avg output |
|---|---|---|
| A0S | ${avgA0sIn} | ${avgA0sOut} |
| A1S | ${avgA1sIn} | ${avgA1sOut} |
| Judge | ${avgJudgeIn} | ${avgJudgeOut} |

Total tokens — input: ${totalIn.toLocaleString()} / output: ${totalOut.toLocaleString()}
Estimated cost: **$${costEstimate}** (Sonnet 4.6 pricing: ~$3/M input, ~$15/M output)

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

A1S won ${counts.A1S_WON} / ${total} comparisons (${((counts.A1S_WON / total) * 100).toFixed(1)}%) vs A0S's ${counts.A0S_WON} (${((counts.A0S_WON / total) * 100).toFixed(1)}%).
${counts.A1S_WON > counts.A0S_WON ? 'A1S is the stronger baseline on Sonnet 4.6 — rich prompting adds value over naive.' : counts.A0S_WON > counts.A1S_WON ? 'A0S outperformed A1S — rich prompting did not improve over naive for Sonnet 4.6. Flag before proceeding.' : 'A1S and A0S are roughly equivalent — rich prompting produced no improvement over naive for Sonnet 4.6.'}
`

  const outPath = join(import.meta.dir, '../../../../specs/v2-results/step-1-analysis-sonnet.md')
  writeFileSync(outPath, report, 'utf-8')
  console.log(`\nReport written to: ${outPath}`)

  console.log(`\n${'═'.repeat(72)}`)
  console.log('  V2 Step 3.5 Part 1 Summary (Sonnet)')
  console.log('─'.repeat(72))
  console.log(`  A1S won: ${counts.A1S_WON}/${total} (${((counts.A1S_WON / total) * 100).toFixed(1)}%)`)
  console.log(`  A0S won: ${counts.A0S_WON}/${total} (${((counts.A0S_WON / total) * 100).toFixed(1)}%)`)
  console.log(`  Tie/Negligible: ${counts.TIE + counts.NEGLIGIBLE}/${total}`)
  console.log(`  A1S JSON parse rate: ${a1sValidJson}/${a1sTotalRuns}`)
  console.log(`  Estimated cost: $${costEstimate}`)
  console.log(`${'═'.repeat(72)}\n`)
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
