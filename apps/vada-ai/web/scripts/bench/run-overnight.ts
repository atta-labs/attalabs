// Entry point for overnight bench runs.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/run-overnight.ts
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/run-overnight.ts T1 A1 E2
//
// Requires: dev server running (bun run dev:vada) + .env.local with
//   ANTHROPIC_API_KEY, CLERK_SECRET_KEY, CLERK_SESSION_ID
//
// Resumability: if a question already has a completed judge verdict in
// benchmark_metrics, it is skipped. Safe to restart after crashes.
// Budget cap: hard-stops at $28 (see budget.ts). Remaining questions
// logged as "skipped: budget cap".

import { config } from 'dotenv'

config({ path: '.env.local' })

import { findCompletedBenchmarkForQuestion } from '@/db/queries'
import { BudgetTracker } from './budget'
import { corpus } from './corpus'
import { BudgetExhaustedError, runQuestion } from './runner'
import type { RunResult } from './runner'

const hr = (char = '─', len = 72) => char.repeat(len)

async function main() {
  const args = process.argv.slice(2)
  const filterIds = args.length > 0 ? new Set(args) : null
  const questions = filterIds ? corpus.filter((q) => filterIds.has(q.id)) : corpus

  if (filterIds && questions.length === 0) {
    console.error(`No questions matched IDs: ${[...filterIds].join(', ')}`)
    process.exit(1)
  }

  const budget = new BudgetTracker()
  const results: Array<{
    id: string
    status: 'done' | 'skipped_resume' | 'skipped_budget' | 'error'
    result?: RunResult
    error?: string
  }> = []

  console.log(`\n${hr('═')}`)
  console.log(`  Vāda Overnight Bench — ${questions.length} question(s)`)
  console.log(hr('═'))
  console.log('  Model:  anthropic/claude-sonnet-4-6 (Vāda + baseline + judge)')
  console.log('  Budget: $28 hard cap')
  if (filterIds) console.log(`  Mode:   smoke test [${[...filterIds].join(', ')}]`)
  console.log()

  for (const question of questions) {
    console.log(hr())
    console.log(
      `[${question.id}] ${question.category} | ${question.difficulty} | expected: ${question.expected_terminal_likelihood}`
    )
    console.log(`  "${question.text.slice(0, 80)}${question.text.length > 80 ? '…' : ''}"`)

    // Resumability: skip if already completed
    const existing = await findCompletedBenchmarkForQuestion(question.text)
    if (existing) {
      console.log(`  ↩ Already completed (${existing.judgeDiagnosis ?? 'unknown'}) — skipping`)
      results.push({ id: question.id, status: 'skipped_resume' })
      continue
    }

    // Budget gate
    if (budget.exhausted) {
      console.log(`  ⊘ Skipped: budget cap — ${budget.summary()}`)
      results.push({ id: question.id, status: 'skipped_budget' })
      continue
    }

    console.log(`  → Starting (${budget.summary()})`)
    const questionStart = Date.now()

    try {
      const result = await runQuestion(question, budget)
      const totalElapsed = ((Date.now() - questionStart) / 1000).toFixed(1)

      console.log(`  ✓ ${result.diagnosis ?? 'NO_DIAGNOSIS'} | ${totalElapsed}s | ${budget.summary()}`)
      console.log(
        `    Vāda:     ${result.vadaTokensIn}in / ${result.vadaTokensOut}out | ${(result.vadaElapsedMs / 1000).toFixed(1)}s`
      )
      console.log(
        `    Baseline: ${result.baselineTokensIn}in / ${result.baselineTokensOut}out | ${(result.baselineElapsedMs / 1000).toFixed(1)}s`
      )
      console.log(
        `    Judge:    ${result.judgeTokensIn}in / ${result.judgeTokensOut}out | ${(result.judgeElapsedMs / 1000).toFixed(1)}s`
      )
      console.log(`    Session:  ${result.sessionId}`)
      console.log(`    Vāda rec: ${result.vadaRecommendationSnippet.slice(0, 120)}…`)
      console.log(`    Baseline: ${result.baselineAnswerSnippet.slice(0, 120)}…`)

      results.push({ id: question.id, status: 'done', result })
    } catch (err) {
      if (err instanceof BudgetExhaustedError) {
        console.log(`  ⊘ Skipped: budget cap — ${budget.summary()}`)
        results.push({ id: question.id, status: 'skipped_budget' })
        // Mark remaining as budget-capped too
        continue
      }
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ Error: ${msg}`)
      results.push({ id: question.id, status: 'error', error: msg })
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const done = results.filter((r) => r.status === 'done')
  const skippedResume = results.filter((r) => r.status === 'skipped_resume')
  const skippedBudget = results.filter((r) => r.status === 'skipped_budget')
  const errors = results.filter((r) => r.status === 'error')

  const diagnosisCounts: Record<string, number> = {}
  for (const r of done) {
    const d = r.result?.diagnosis ?? 'NO_DIAGNOSIS'
    diagnosisCounts[d] = (diagnosisCounts[d] ?? 0) + 1
  }

  console.log(`\n${hr('═')}`)
  console.log('  Run summary')
  console.log(hr('─'))
  console.log(`  Completed:      ${done.length}`)
  console.log(`  Skipped (done): ${skippedResume.length}`)
  console.log(`  Skipped ($$):   ${skippedBudget.length}`)
  console.log(`  Errors:         ${errors.length}`)
  console.log(`  Budget:         ${budget.summary()}`)
  if (done.length > 0) {
    console.log(hr('─'))
    console.log('  Diagnoses:')
    for (const [diagnosis, count] of Object.entries(diagnosisCounts)) {
      console.log(`    ${diagnosis.padEnd(24)} ${count}`)
    }
  }
  console.log(`${hr('═')}\n`)

  if (errors.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
