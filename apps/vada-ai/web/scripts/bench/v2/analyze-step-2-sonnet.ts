// V2 Step 3.5 Part 2 — Analysis: A0S vs B0S orchestration-alone on Sonnet 4.6.
//
// Reads from v2_baseline_runs, v2_orchestration_runs, and v2_judge_results
// (comparison_type = baseline-vs-vada-sonnet).
// Writes report to apps/vada-ai/specs/v2-results/step-2-analysis-sonnet.md.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/analyze-step-2-sonnet.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { corpus } from '../corpus'
import { V2S_MODEL_ID, V2S_JUDGE_MODEL_ID } from './config-sonnet'
import { getAllV2Step2SonnetJudgeResults, getV2BaselineRunsForQuestion, getV2OrchestrationRunsForModel } from './db'

function normalizeVerdict(
  diagnosis: string | null,
  systemADescription: string
): 'B0S_WON' | 'A0S_WON' | 'TIE' | 'NEGLIGIBLE' | 'FAILURE' | 'UNKNOWN' {
  if (!diagnosis) return 'UNKNOWN'
  const slotAIsB0S = systemADescription.startsWith('B0S')
  switch (diagnosis) {
    case 'A_WON':
      return slotAIsB0S ? 'B0S_WON' : 'A0S_WON'
    case 'B_WON':
      return slotAIsB0S ? 'A0S_WON' : 'B0S_WON'
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
  const allJudgeResults = await getAllV2Step2SonnetJudgeResults()

  if (allJudgeResults.length === 0) {
    console.error('No V2 Sonnet Step 2 judge results found. Run compare-a0-b0-sonnet.ts first.')
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

  const counts = { B0S_WON: 0, A0S_WON: 0, TIE: 0, NEGLIGIBLE: 0, FAILURE: 0, UNKNOWN: 0 }
  for (const r of normalized) counts[r.verdict]++
  const total = normalized.length

  const byQuestion: Record<string, NormalizedResult[]> = {}
  for (const r of normalized) {
    byQuestion[r.questionId] ??= []
    byQuestion[r.questionId].push(r)
  }

  const categories = ['Technical', 'Business', 'Ethical', 'Personal', 'Ambiguous'] as const
  const categoryStats: Record<string, { b0s: number; a0s: number; tie: number; total: number }> = {}
  for (const cat of categories) categoryStats[cat] = { b0s: 0, a0s: 0, tie: 0, total: 0 }
  for (const r of normalized) {
    const q = corpusById[r.questionId]
    if (!q) continue
    const s = categoryStats[q.category]
    s.total++
    if (r.verdict === 'B0S_WON') s.b0s++
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

  // B0S terminal state breakdown (Sonnet orchestration runs only)
  const b0sRuns = await getV2OrchestrationRunsForModel(V2S_MODEL_ID)
  const b0sTotalRuns = b0sRuns.length
  const terminalCounts: Record<string, number> = {}
  for (const r of b0sRuns) {
    const ts = r.terminalState ?? 'UNKNOWN'
    terminalCounts[ts] = (terminalCounts[ts] ?? 0) + 1
  }

  let a0sInTotal = 0
  let a0sOutTotal = 0
  let a0sCount = 0
  let judgeInTotal = 0
  let judgeOutTotal = 0

  // Only count A0S tokens for questions that participated in Step 2 (have B0S judge results).
  for (const questionId of Object.keys(byQuestion)) {
    const a0sRuns = await getV2BaselineRunsForQuestion(questionId, 'A0S')
    for (const r of a0sRuns) {
      a0sInTotal += r.tokensInput ?? 0
      a0sOutTotal += r.tokensOutput ?? 0
      a0sCount++
    }
  }
  for (const r of allJudgeResults) {
    judgeInTotal += r.tokensInput ?? 0
    judgeOutTotal += r.tokensOutput ?? 0
  }

  const avgA0sIn = a0sCount > 0 ? Math.round(a0sInTotal / a0sCount) : 0
  const avgA0sOut = a0sCount > 0 ? Math.round(a0sOutTotal / a0sCount) : 0
  const avgJudgeIn = allJudgeResults.length > 0 ? Math.round(judgeInTotal / allJudgeResults.length) : 0
  const avgJudgeOut = allJudgeResults.length > 0 ? Math.round(judgeOutTotal / allJudgeResults.length) : 0

  // Sonnet 4.6 pricing: ~$3/M input, ~$15/M output
  const totalIn = a0sInTotal + judgeInTotal
  const totalOut = a0sOutTotal + judgeOutTotal
  const costEstimate = ((totalIn * 3.0 + totalOut * 15.0) / 1_000_000).toFixed(3)

  const b0sWonSamples = normalized.filter((r) => r.verdict === 'B0S_WON').slice(0, 2)
  const a0sWonSamples = normalized.filter((r) => r.verdict === 'A0S_WON').slice(0, 1)
  const sampleVerdicts = [...b0sWonSamples, ...a0sWonSamples]

  const questionRows: string[] = []
  for (const question of corpus) {
    const runs = byQuestion[question.id] ?? []
    const verdicts = runs.map((r) => r.verdict)
    const b0s = verdicts.filter((v) => v === 'B0S_WON').length
    const a0s = verdicts.filter((v) => v === 'A0S_WON').length
    const tie = verdicts.filter((v) => v === 'TIE' || v === 'NEGLIGIBLE').length
    const fail = verdicts.filter((v) => v === 'FAILURE' || v === 'UNKNOWN').length
    const summary =
      runs.length > 0 ? `B0S:${b0s} A0S:${a0s} tie:${tie}${fail > 0 ? ` fail:${fail}` : ''}` : '— no B0S runs'
    questionRows.push(`| ${question.id} | ${question.category} | ${question.difficulty} | ${summary} |`)
  }

  const terminalRows = Object.entries(terminalCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([state, n]) => `| ${state} | ${n} | ${b0sTotalRuns > 0 ? ((n / b0sTotalRuns) * 100).toFixed(1) : 0}% |`)
    .join('\n')

  const b0sWinRate = total > 0 ? ((counts.B0S_WON / total) * 100).toFixed(1) : '0'
  const a0sWinRate = total > 0 ? ((counts.A0S_WON / total) * 100).toFixed(1) : '0'

  let outcome: string
  if (counts.B0S_WON > counts.A0S_WON) {
    outcome = `B0S (Vāda on Sonnet) outperformed A0S single-shot: ${counts.B0S_WON}/${total} (${b0sWinRate}%) vs ${counts.A0S_WON}/${total} (${a0sWinRate}%). Orchestration adds value on Sonnet 4.6.`
  } else if (counts.A0S_WON > counts.B0S_WON) {
    outcome = `A0S single-shot outperformed B0S (Vāda on Sonnet): ${counts.A0S_WON}/${total} (${a0sWinRate}%) vs ${counts.B0S_WON}/${total} (${b0sWinRate}%). Orchestration overhead did not pay off on Sonnet 4.6.`
  } else {
    outcome = `A0S and B0S are roughly equivalent: ${counts.A0S_WON}/${total} A0S vs ${counts.B0S_WON}/${total} B0S. No clear advantage from orchestration on Sonnet 4.6.`
  }

  const report = `# V2 Step 3.5 Part 2 Analysis — A0S vs B0S Orchestration-Alone on Sonnet 4.6

Generated: ${new Date().toISOString().slice(0, 10)}

---

## Run metadata

| Field | Value |
|---|---|
| Test model | \`${V2S_MODEL_ID}\` |
| Judge model | \`${V2S_JUDGE_MODEL_ID}\` |
| Corpus | ${Object.keys(byQuestion).length} questions tested (of ${corpus.length} total; B0S subset only) |
| Runs per config | 3 (N=3) |
| Total A0S baseline calls | ${a0sCount} |
| Total B0S orchestration runs | ${b0sTotalRuns} |
| Total judge calls | ${allJudgeResults.length} |
| Position mode | standard (2:1 A0S-first for N=3) |

---

## Overall results (normalized to B0S vs A0S)

| Verdict | Count | % |
|---|---|---|
| B0S (Vāda) won | ${counts.B0S_WON} | ${b0sWinRate}% |
| A0S (single-shot) won | ${counts.A0S_WON} | ${a0sWinRate}% |
| Tie | ${counts.TIE} | ${total > 0 ? ((counts.TIE / total) * 100).toFixed(1) : 0}% |
| Negligible | ${counts.NEGLIGIBLE} | ${total > 0 ? ((counts.NEGLIGIBLE / total) * 100).toFixed(1) : 0}% |
| Pipeline failure | ${counts.FAILURE} | ${total > 0 ? ((counts.FAILURE / total) * 100).toFixed(1) : 0}% |
| **Total** | **${total}** | |

---

## Win rate by category

| Category | B0S won | A0S won | Tie/Neg | Total |
|---|---|---|---|---|
${categories.map((c) => `| ${c} | ${categoryStats[c].b0s} | ${categoryStats[c].a0s} | ${categoryStats[c].tie} | ${categoryStats[c].total} |`).join('\n')}

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

## B0S terminal state breakdown

| Terminal state | Count | % |
|---|---|---|
${terminalRows}

---

## Token economics (A0S + judge only; B0S tokens counted inside Vāda sessions)

| Variant | Avg input | Avg output |
|---|---|---|
| A0S | ${avgA0sIn} | ${avgA0sOut} |
| Judge | ${avgJudgeIn} | ${avgJudgeOut} |

Total tokens — input: ${totalIn.toLocaleString()} / output: ${totalOut.toLocaleString()}
Estimated cost (A0S + judge only): **$${costEstimate}** (Sonnet 4.6 pricing: ~$3/M input, ~$15/M output)

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

  const outPath = join(import.meta.dir, '../../../../specs/v2-results/step-2-analysis-sonnet.md')
  writeFileSync(outPath, report, 'utf-8')
  console.log(`\nReport written to: ${outPath}`)

  console.log(`\n${'═'.repeat(72)}`)
  console.log('  V2 Step 3.5 Part 2 Summary (Sonnet)')
  console.log('─'.repeat(72))
  console.log(`  B0S won: ${counts.B0S_WON}/${total} (${b0sWinRate}%)`)
  console.log(`  A0S won: ${counts.A0S_WON}/${total} (${a0sWinRate}%)`)
  console.log(`  Tie/Negligible: ${counts.TIE + counts.NEGLIGIBLE}/${total}`)
  console.log(`  Estimated cost (A0S+judge): $${costEstimate}`)
  console.log(`${'═'.repeat(72)}\n`)
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
