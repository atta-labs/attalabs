// V2 Task 3.5 — A1S vs B0S judge comparison.
//
// Pairs A1S (rich-prompted Sonnet baseline) against B0S (Vāda V1 orchestration on Sonnet)
// for the 7 V1-loss questions (T1, T3, T4, T5, B3, A1, A2).
// Results persist to v2_judge_results with comparisonType='rich-baseline-vs-vada-sonnet'.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/compare-a1s-b0s.ts
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/compare-a1s-b0s.ts T1 B3
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/compare-a1s-b0s.ts --position-mode balanced
//
// Requires: dev server running + .env.local with CLERK_SECRET_KEY, CLERK_SESSION_ID,
//           ANTHROPIC_API_KEY, VADA_BASE_URL

import { config } from 'dotenv'
config({ path: '.env.local' })

import { corpus } from '../corpus'
import { V2S_JUDGE_MODEL_ID, V2S_MODEL_PROVIDER, V2S_RUNS_PER_CONFIG, assertSonnetModelId } from './config-sonnet'
import { getV2BaselineRun, getV2OrchestrationRunForModel, getExistingV2JudgeResult } from './db'

type PositionMode = 'standard' | 'balanced'

const BASE_URL = process.env.VADA_BASE_URL ?? 'http://localhost:3003'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? ''
const CLERK_SESSION_ID = process.env.CLERK_SESSION_ID ?? 'sess_3CSsNVZgk2K5KBYx0eZDqALfkBA'

const hr = (char = '─', len = 72) => char.repeat(len)

assertSonnetModelId(V2S_JUDGE_MODEL_ID)

const DESC = {
  A1S: 'A1S rich-prompted single-shot baseline on Sonnet (structured JSON with branches and caveats)',
  B0S: 'B0S V1 Vāda full deliberation workflow on Sonnet (orchestration-alone)'
}

// The 7 V1-loss question IDs (subset with B0S runs)
const V1_LOSS_IDS = new Set(['T1', 'T3', 'T4', 'T5', 'B3', 'A1', 'A2'])

function slotAssignment(runIndex: number, mode: PositionMode): { slotA: 'A1S' | 'B0S'; slotB: 'A1S' | 'B0S' } {
  const a1sFirst = mode === 'standard' ? runIndex % 2 === 0 : runIndex % 2 === 1
  return a1sFirst ? { slotA: 'A1S', slotB: 'B0S' } : { slotA: 'B0S', slotB: 'A1S' }
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
      provider: V2S_MODEL_PROVIDER,
      modelId: V2S_JUDGE_MODEL_ID,
      apiKey: ANTHROPIC_API_KEY,
      systemADescription: params.systemADescription,
      systemBDescription: params.systemBDescription,
      comparisonType: 'rich-baseline-vs-vada-sonnet'
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
  const questions = corpus.filter((q) => V1_LOSS_IDS.has(q.id) && (!filterIds || filterIds.has(q.id)))

  console.log(`\n${hr('═')}`)
  console.log('  V2 Task 3.5 — A1S vs B0S Judge Comparison')
  console.log(hr('═'))
  console.log(`  Judge model: ${V2S_JUDGE_MODEL_ID}`)
  console.log(`  Questions:   ${questions.length} (V1-loss subset)`)
  console.log(`  Runs/q:      ${V2S_RUNS_PER_CONFIG}`)
  console.log(`  Position:    ${positionMode}`)
  console.log(`  Total calls: ${questions.length * V2S_RUNS_PER_CONFIG} expected`)
  console.log()

  let totalCompleted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const question of questions) {
    console.log(hr())
    console.log(`[${question.id}] ${question.category}`)
    console.log(`  "${question.text.slice(0, 80)}${question.text.length > 80 ? '…' : ''}"`)

    for (let runIndex = 0; runIndex < V2S_RUNS_PER_CONFIG; runIndex++) {
      const { slotA, slotB } = slotAssignment(runIndex, positionMode)
      const systemADesc = DESC[slotA]
      const systemBDesc = DESC[slotB]

      const existing = await getExistingV2JudgeResult(question.text, systemADesc, runIndex, 'rich-baseline-vs-vada-sonnet')
      if (existing) {
        console.log(`  [run ${runIndex}] ↩ Already judged (${existing.diagnosis}) — skipping`)
        totalSkipped++
        continue
      }

      const a1sRun = await getV2BaselineRun(question.id, 'A1S', runIndex)
      const b0sRun = await getV2OrchestrationRunForModel(question.id, runIndex, V2S_JUDGE_MODEL_ID)

      if (!a1sRun || !b0sRun) {
        console.log(
          `  [run ${runIndex}] ✗ Missing run(s) — a1s:${!!a1sRun} b0s:${!!b0sRun}`
        )
        totalErrors++
        continue
      }

      const responseA = slotA === 'A1S' ? a1sRun.responseText : (b0sRun.conclusionText ?? '')
      const responseB = slotB === 'B0S' ? (b0sRun.conclusionText ?? '') : a1sRun.responseText

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
