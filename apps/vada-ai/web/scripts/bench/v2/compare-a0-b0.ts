// V2 Step 2 — A0 vs B0 judge comparison.
//
// Loads A0 runs from v2_baseline_runs and B0 runs from v2_orchestration_runs,
// calls /api/benchmark/v2-judge for each pair, results persist to v2_judge_results.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/compare-a0-b0.ts
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/compare-a0-b0.ts T1
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/compare-a0-b0.ts --position-mode balanced
//
// Requires: dev server running + .env.local with CLERK_SECRET_KEY, CLERK_SESSION_ID,
//           ANTHROPIC_API_KEY, VADA_BASE_URL

import { config } from 'dotenv'
config({ path: '.env.local' })

import { corpus } from '../corpus'
import { V2_JUDGE_MODEL_ID, V2_MODEL_PROVIDER, V2_RUNS_PER_CONFIG, assertModelId } from './config'
import { getV2BaselineRun, getV2OrchestrationRun, getExistingV2JudgeResult } from './db'

type PositionMode = 'standard' | 'balanced'

const BASE_URL = process.env.VADA_BASE_URL ?? 'http://localhost:3003'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? ''
const CLERK_SESSION_ID = process.env.CLERK_SESSION_ID ?? 'sess_3CSsNVZgk2K5KBYx0eZDqALfkBA'

const hr = (char = '─', len = 72) => char.repeat(len)

assertModelId(V2_JUDGE_MODEL_ID, 'claude-haiku-4-5-20251001')

const DESC = {
  A0: 'A0 naive single-shot baseline (terse, direct)',
  B0: 'B0 V1 Vāda full deliberation workflow on Haiku (orchestration-alone)'
}

function slotAssignment(runIndex: number, mode: PositionMode): { slotA: 'A0' | 'B0'; slotB: 'A0' | 'B0' } {
  const a0First = mode === 'standard' ? runIndex % 2 === 0 : runIndex % 2 === 1
  return a0First ? { slotA: 'A0', slotB: 'B0' } : { slotA: 'B0', slotB: 'A0' }
}

async function getClerkToken(): Promise<string> {
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not set')
  const res = await fetch(`https://api.clerk.com/v1/sessions/${CLERK_SESSION_ID}/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Clerk token fetch failed: ${res.status}`)
  const data = (await res.json()) as { jwt: string }
  return data.jwt
}

async function callV2Judge(params: {
  question: string
  responseA: string
  responseB: string
  systemADescription: string
  systemBDescription: string
  runIndex: number
  token: string
}): Promise<{ ok: boolean; diagnosis: string | null }> {
  const res = await fetch(`${BASE_URL}/api/benchmark/v2-judge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: null,
      runIndex: params.runIndex,
      question: params.question,
      responseA: params.responseA,
      responseB: params.responseB,
      provider: V2_MODEL_PROVIDER,
      modelId: V2_JUDGE_MODEL_ID,
      apiKey: ANTHROPIC_API_KEY,
      systemADescription: params.systemADescription,
      systemBDescription: params.systemBDescription,
      comparisonType: 'baseline-vs-vada'
    }),
    signal: AbortSignal.timeout(120_000)
  })
  if (!res.ok) throw new Error(`Judge call failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { ok: boolean; diagnosis: string | null }
  return data
}

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const args = process.argv.slice(2)
  const positionModeArg = args.indexOf('--position-mode')
  const positionMode: PositionMode =
    positionModeArg !== -1 && args[positionModeArg + 1] === 'balanced' ? 'balanced' : 'standard'
  const questionIds = args.filter((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--position-mode')
  const filterIds = questionIds.length > 0 ? new Set(questionIds) : null
  const questions = filterIds ? corpus.filter((q) => filterIds.has(q.id)) : corpus

  console.log(`\n${hr('═')}`)
  console.log('  V2 Step 2 — A0 vs B0 Judge Comparison')
  console.log(hr('═'))
  console.log(`  Judge model: ${V2_JUDGE_MODEL_ID}`)
  console.log(`  Questions:   ${questions.length}`)
  console.log(`  Runs/q:      ${V2_RUNS_PER_CONFIG}`)
  console.log(`  Position:    ${positionMode}`)
  console.log(`  Total calls: ${questions.length * V2_RUNS_PER_CONFIG} expected`)
  console.log()

  let totalCompleted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const question of questions) {
    console.log(hr())
    console.log(`[${question.id}] ${question.category}`)
    console.log(`  "${question.text.slice(0, 80)}${question.text.length > 80 ? '…' : ''}"`)

    for (let runIndex = 0; runIndex < V2_RUNS_PER_CONFIG; runIndex++) {
      const { slotA, slotB } = slotAssignment(runIndex, positionMode)
      const systemADesc = DESC[slotA]
      const systemBDesc = DESC[slotB]

      const existing = await getExistingV2JudgeResult(question.text, systemADesc, runIndex)
      if (existing) {
        console.log(`  [run ${runIndex}] ↩ Already judged (${existing.diagnosis}) — skipping`)
        totalSkipped++
        continue
      }

      const a0Run = await getV2BaselineRun(question.id, 'A0', runIndex)
      const b0Run = await getV2OrchestrationRun(question.id, runIndex)

      if (!a0Run || !b0Run) {
        console.log(`  [run ${runIndex}] ✗ Missing run(s) — run baseline-ceiling.ts + orchestration-alone.ts first`)
        totalErrors++
        continue
      }

      const responseA = slotA === 'A0' ? a0Run.responseText : (b0Run.conclusionText ?? '')
      const responseB = slotB === 'B0' ? (b0Run.conclusionText ?? '') : a0Run.responseText

      try {
        const token = await getClerkToken()
        const start = Date.now()
        const result = await callV2Judge({
          question: question.text,
          responseA,
          responseB,
          systemADescription: systemADesc,
          systemBDescription: systemBDesc,
          runIndex,
          token
        })
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)

        const posLabel = `A=${slotA} B=${slotB}`
        console.log(`  [run ${runIndex}] ✓ ${result.diagnosis} | ${posLabel} | ${elapsed}s`)
        totalCompleted++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`  [run ${runIndex}] ✗ Error: ${msg}`)
        totalErrors++
      }
    }
  }

  console.log(`\n${hr('═')}`)
  console.log('  Comparison run complete')
  console.log(hr('─'))
  console.log(`  Completed: ${totalCompleted}`)
  console.log(`  Skipped (resume): ${totalSkipped}`)
  console.log(`  Errors: ${totalErrors}`)
  console.log(`${hr('═')}\n`)

  if (totalErrors > 0) process.exit(1)
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
