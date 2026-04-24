// V2 Step 3.5 — A0S vs A1S baseline ceiling test on Sonnet 4.6.
//
// Runs A0S (naive prompt) and A1S (rich-prompted) variants for each question,
// N=3 per variant, persists results to v2_baseline_runs with variant prefix 'A0S'/'A1S'.
// Keeps Haiku rows (A0, A1) and Sonnet rows (A0S, A1S) separate in the same table.
//
// Usage (from apps/vada-ai/web/):
//   bun scripts/bench/v2/baseline-ceiling-sonnet.ts
//   bun scripts/bench/v2/baseline-ceiling-sonnet.ts T1 B3
//
// Requires: .env.local with ANTHROPIC_API_KEY

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { corpus } from '../corpus'
import { V2S_MODEL_ID, V2S_MODEL_PROVIDER, V2S_RUNS_PER_CONFIG, assertSonnetModelId } from './config-sonnet'
import { insertV2BaselineRun, getV2BaselineRun } from './db'
import { A0_NAIVE_PROMPT, buildA1Prompt } from './prompts'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''

const hr = (char = '─', len = 72) => char.repeat(len)

console.log(`\n${hr('═')}`)
console.log('  V2 Step 3.5 — Baseline Ceiling (A0S vs A1S on Sonnet 4.6)')
console.log(hr('═'))
console.log(`  Model:   ${V2S_MODEL_ID}`)
console.log(`  Corpus:  ${corpus.length} questions`)
console.log(`  Runs:    ${V2S_RUNS_PER_CONFIG} per variant × 2 variants = ${V2S_RUNS_PER_CONFIG * 2} per question`)
console.log()

assertSonnetModelId(V2S_MODEL_ID)

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const args = process.argv.slice(2)
  const filterIds = args.length > 0 ? new Set(args) : null
  const questions = filterIds ? corpus.filter((q) => filterIds.has(q.id)) : corpus

  if (filterIds && questions.length === 0) {
    console.error(`No questions matched IDs: ${[...filterIds].join(', ')}`)
    process.exit(1)
  }

  const variants: Array<{ name: 'A0S' | 'A1S'; label: string }> = [
    { name: 'A0S', label: 'naive' },
    { name: 'A1S', label: 'rich-prompted' }
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
      // A0S: naive prompt, user prompt = question text
      // A1S: rich-prompted system prompt with question embedded, user prompt = 'Respond now.'
      const baseVariant = variant.name === 'A0S' ? 'A0' : 'A1'
      const systemPrompt = baseVariant === 'A0' ? A0_NAIVE_PROMPT : buildA1Prompt(question.text)
      const userPrompt = baseVariant === 'A0' ? question.text : 'Respond now.'

      for (let runIndex = 0; runIndex < V2S_RUNS_PER_CONFIG; runIndex++) {
        const existing = await getV2BaselineRun(question.id, variant.name, runIndex)
        if (existing) {
          console.log(`  [${variant.name} run ${runIndex}] ↩ Already completed — skipping`)
          totalSkipped++
          continue
        }

        const start = Date.now()
        try {
          assertSonnetModelId(V2S_MODEL_ID)
          const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY })
          const result = await generateText({
            model: anthropic(V2S_MODEL_ID),
            system: systemPrompt,
            prompt: userPrompt
          })
          const responseText = result.text
          const tokensIn = result.usage.inputTokens
          const tokensOut = result.usage.outputTokens
          const elapsedMs = Date.now() - start

          let parsedJson: unknown | null = null
          let schemaValid: boolean | null = null
          if (variant.name === 'A1S') {
            const fenceMatch = responseText.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/m)
            const candidate = fenceMatch ? fenceMatch[1]! : responseText
            try {
              parsedJson = JSON.parse(candidate)
              schemaValid = true
            } catch {
              console.log(`  [${variant.name} run ${runIndex}] ⚠ JSON parse failed`)
            }
          }

          await insertV2BaselineRun({
            questionId: question.id,
            variant: variant.name,
            runIndex,
            questionText: question.text,
            responseText,
            parsedJson,
            schemaValid, // true if JSON parsed (fence-stripped or bare); null for A0S
            modelId: V2S_MODEL_ID,
            provider: V2S_MODEL_PROVIDER,
            tokensInput: tokensIn,
            tokensOutput: tokensOut,
            elapsedMs
          })

          const elapsed = (elapsedMs / 1000).toFixed(1)
          const jsonStatus = variant.name === 'A1S' ? (parsedJson ? ' ✓JSON' : ' ✗JSON') : ''
          console.log(`  [${variant.name} run ${runIndex}] ✓ ${tokensIn}in/${tokensOut}out ${elapsed}s${jsonStatus}`)
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
  console.log('  Baseline ceiling run complete (Sonnet)')
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
