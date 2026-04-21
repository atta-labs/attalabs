// V2 Step 1 — A0 vs A1 baseline ceiling test on Haiku 4.5.
//
// Runs A0 (naive prompt) and A1 (rich-prompted) variants for each question,
// N=3 per variant, persists results to v2_baseline_runs.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/baseline-ceiling.ts
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/baseline-ceiling.ts T1 B3
//
// Requires: .env.local with ANTHROPIC_API_KEY

import { config } from 'dotenv'
config({ path: '.env.local' })

import { executeConclusionTurn } from '@atta/orchestration/server'
import { corpus } from '../corpus'
import { V2_MODEL_ID, V2_MODEL_PROVIDER, V2_RUNS_PER_CONFIG, assertModelId } from './config'
import { insertV2BaselineRun, getV2BaselineRun } from './db'
import { A0_NAIVE_PROMPT, buildA1Prompt } from './prompts'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''

const hr = (char = '─', len = 72) => char.repeat(len)

console.log(`\n${hr('═')}`)
console.log('  V2 Step 1 — Baseline Ceiling (A0 vs A1 on Haiku 4.5)')
console.log(hr('═'))
console.log(`  Model:   ${V2_MODEL_ID}`)
console.log(`  Corpus:  ${corpus.length} questions`)
console.log(`  Runs:    ${V2_RUNS_PER_CONFIG} per variant × 2 variants = ${V2_RUNS_PER_CONFIG * 2} per question`)
console.log()

assertModelId(V2_MODEL_ID, 'claude-haiku-4-5-20251001')

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const args = process.argv.slice(2)
  const filterIds = args.length > 0 ? new Set(args) : null
  const questions = filterIds ? corpus.filter((q) => filterIds.has(q.id)) : corpus

  if (filterIds && questions.length === 0) {
    console.error(`No questions matched IDs: ${[...filterIds].join(', ')}`)
    process.exit(1)
  }

  const variants: Array<{ name: 'A0' | 'A1'; label: string }> = [
    { name: 'A0', label: 'naive' },
    { name: 'A1', label: 'rich-prompted' }
  ]

  let totalCompleted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const question of questions) {
    console.log(hr())
    console.log(`[${question.id}] ${question.category} | ${question.difficulty}`)
    console.log(`  "${question.text.slice(0, 80)}${question.text.length > 80 ? '…' : ''}"`)
    console.log()

    for (const variant of variants) {
      const systemPrompt = variant.name === 'A0' ? A0_NAIVE_PROMPT : buildA1Prompt(question.text)
      // A1 uses the {{QUESTION}} substituted version as system prompt.
      // A0: user prompt = question, system prompt = naive instruction.
      // A1: system prompt = the full rich prompt with question embedded.
      const userPrompt = variant.name === 'A0' ? question.text : 'Respond now.'

      for (let runIndex = 0; runIndex < V2_RUNS_PER_CONFIG; runIndex++) {
        const existing = await getV2BaselineRun(question.id, variant.name, runIndex)
        if (existing) {
          console.log(`  [${variant.name} run ${runIndex}] ↩ Already completed — skipping`)
          totalSkipped++
          continue
        }

        const start = Date.now()
        try {
          const result = await executeConclusionTurn({
            phase: 'synthesize',
            systemPrompt,
            userPrompt,
            model: { provider: V2_MODEL_PROVIDER, modelId: V2_MODEL_ID },
            apiKey: ANTHROPIC_API_KEY
          })

          assertModelId(V2_MODEL_ID, 'claude-haiku-4-5-20251001')

          let parsedJson: unknown | null = null
          if (variant.name === 'A1') {
            try {
              parsedJson = JSON.parse(result.content)
            } catch {
              // Not valid JSON — store null, log the issue
              console.log(`  [${variant.name} run ${runIndex}] ⚠ JSON parse failed`)
            }
          }

          await insertV2BaselineRun({
            questionId: question.id,
            variant: variant.name,
            runIndex,
            questionText: question.text,
            responseText: result.content,
            parsedJson,
            schemaValid: null, // full validation deferred to Task 4
            modelId: V2_MODEL_ID,
            provider: V2_MODEL_PROVIDER,
            tokensInput: result.inputTokens,
            tokensOutput: result.outputTokens,
            elapsedMs: result.durationMs
          })

          const elapsed = ((Date.now() - start) / 1000).toFixed(1)
          const jsonStatus = variant.name === 'A1' ? (parsedJson ? ' ✓JSON' : ' ✗JSON') : ''
          console.log(
            `  [${variant.name} run ${runIndex}] ✓ ${result.inputTokens}in/${result.outputTokens}out ${elapsed}s${jsonStatus}`
          )
          totalCompleted++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.log(`  [${variant.name} run ${runIndex}] ✗ Error: ${msg}`)
          totalErrors++
        }
      }
    }
  }

  console.log(`\n${hr('═')}`)
  console.log('  Baseline ceiling run complete')
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
