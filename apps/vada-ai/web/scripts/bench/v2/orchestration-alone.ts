// V2 Step 2 — B0 orchestration runner.
//
// Creates a real Vāda session per question × run_index with model=claude-haiku-4-5-20251001,
// runs the full V1 workflow directly in this process (not via HTTP, since the dev server
// process has restricted network access to api.anthropic.com), then extracts the conclusion.
//
// Usage (from apps/vada-ai/web/):
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/orchestration-alone.ts
//   bun --preload ./scripts/preload-server-only.ts scripts/bench/v2/orchestration-alone.ts T1
//
// Requires: dev server running + .env.local with CLERK_SECRET_KEY, CLERK_SESSION_ID,
//           ANTHROPIC_API_KEY, VADA_BASE_URL, DATABASE_URL

import { config } from 'dotenv'
config({ path: '.env.local' })

import { Mastra } from '@mastra/core'
import { corpus } from '../corpus'
import { V2_MODEL_ID, V2_MODEL_PROVIDER, V2_RUNS_PER_CONFIG, assertModelId } from './config'
import { getV2OrchestrationRun, insertV2OrchestrationRun, getV2ConclusionForSession } from './db'
import { crucibleWorkflow } from '@/engine/workflow/crucible-workflow'

const BASE_URL = process.env.VADA_BASE_URL ?? 'http://localhost:3003'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? ''
const CLERK_SESSION_ID = process.env.CLERK_SESSION_ID ?? 'sess_3CSsNVZgk2K5KBYx0eZDqALfkBA'

const hr = (char = '─', len = 72) => char.repeat(len)

assertModelId(V2_MODEL_ID, 'claude-haiku-4-5-20251001')

// Mastra instance running in THIS process — has direct network access to Anthropic.
const mastra = new Mastra({ workflows: { crucible: crucibleWorkflow } })

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

async function createSession(question: string, token: string): Promise<string> {
  const delays = [0, 8_000, 20_000] // 3 attempts: immediate, 8s, 20s
  let lastError: Error | null = null
  for (const delay of delays) {
    if (delay > 0) {
      console.log(`    retrying session create in ${delay / 1000}s...`)
      await new Promise((r) => setTimeout(r, delay))
    }
    const freshToken = delay > 0 ? await getClerkToken() : token
    const res = await fetch(`${BASE_URL}/api/deliberation/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        provider: V2_MODEL_PROVIDER,
        modelId: V2_MODEL_ID
      }),
      signal: AbortSignal.timeout(30_000)
    })
    if (res.ok) {
      const data = (await res.json()) as { session_id: string }
      return data.session_id
    }
    const body = await res.text()
    // 429 = daily limit — don't retry
    if (res.status === 429) throw new Error(`Session create failed: ${res.status} ${body}`)
    lastError = new Error(`Session create failed: ${res.status} ${body}`)
    console.log(`    attempt failed (${res.status}): ${body.slice(0, 80)}`)
  }
  throw lastError!
}

function serializeConclusion(json: unknown): string {
  if (!json || typeof json !== 'object') return String(json ?? '')
  const c = json as Record<string, unknown>
  const lines: string[] = []

  if (c.recommendation) lines.push(`Recommendation: ${c.recommendation}`)
  if (c.key_condition) lines.push(`\nKey condition: ${c.key_condition}`)

  const points = c.unresolved_points
  if (Array.isArray(points) && points.length > 0) {
    lines.push('\nUnresolved points:')
    for (const p of points) {
      const pt = p as Record<string, unknown>
      const agents = Array.isArray(pt.agents_involved) ? pt.agents_involved.join(', ') : ''
      lines.push(`• ${pt.point}${agents ? ` (raised by: ${agents})` : ''}`)
    }
  }

  if (c.review_by) lines.push(`\nReview by: ${c.review_by}`)
  return lines.join('\n')
}

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const args = process.argv.slice(2)
  const filterIds = args.length > 0 ? new Set(args) : null
  const questions = filterIds ? corpus.filter((q) => filterIds.has(q.id)) : corpus

  console.log(`\n${hr('═')}`)
  console.log('  V2 Step 2 — B0 Orchestration Runner')
  console.log(hr('═'))
  console.log(`  Model:       ${V2_MODEL_ID}`)
  console.log(`  Questions:   ${questions.length}`)
  console.log(`  Runs/q:      ${V2_RUNS_PER_CONFIG}`)
  console.log(`  Total runs:  ${questions.length * V2_RUNS_PER_CONFIG} expected`)
  console.log('  Mode:        direct (workflow runs in bench process, not dev server)')
  console.log()

  let totalCompleted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const question of questions) {
    console.log(hr())
    console.log(`[${question.id}] ${question.category}`)
    console.log(`  "${question.text.slice(0, 80)}${question.text.length > 80 ? '…' : ''}"`)

    for (let runIndex = 0; runIndex < V2_RUNS_PER_CONFIG; runIndex++) {
      const existing = await getV2OrchestrationRun(question.id, runIndex)
      if (existing) {
        console.log(`  [run ${runIndex}] ↩ Already done (${existing.terminalState}) — skipping`)
        totalSkipped++
        continue
      }

      try {
        const token = await getClerkToken()
        const start = Date.now()

        // Create session via HTTP (needs Clerk auth for user resolution)
        const sessionId = await createSession(question.text, token)
        console.log(`  [run ${runIndex}] Session: ${sessionId}`)

        // Run workflow directly in this process (has network access to Anthropic)
        const wf = mastra.getWorkflow('crucible')
        const run = await wf.createRun()
        const result = await run.start({ inputData: { sessionId, apiKey: ANTHROPIC_API_KEY } })

        if (result.status === 'failed') {
          console.log(`  [run ${runIndex}] ✗ Workflow failed: ${JSON.stringify(result.error).slice(0, 200)}`)
          totalErrors++
          continue
        }

        const elapsed = Date.now() - start

        // Read conclusion directly from DB
        const conclusion = await getV2ConclusionForSession(sessionId)
        if (!conclusion) {
          console.log(`  [run ${runIndex}] ✗ No conclusion row found after workflow completed`)
          totalErrors++
          continue
        }

        const finalJson = conclusion.revisedJson ?? conclusion.originalJson
        const conclusionText = serializeConclusion(finalJson)

        await insertV2OrchestrationRun({
          questionId: question.id,
          runIndex,
          questionText: question.text,
          sessionId,
          conclusionText,
          conclusionJson: finalJson,
          terminalState: conclusion.terminalState,
          modelId: V2_MODEL_ID,
          provider: V2_MODEL_PROVIDER,
          elapsedMs: elapsed
        })

        console.log(`  [run ${runIndex}] ✓ ${conclusion.terminalState} | ${(elapsed / 1000).toFixed(1)}s`)
        totalCompleted++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`  [run ${runIndex}] ✗ Error: ${msg}`)
        totalErrors++
      }
    }
  }

  console.log(`\n${hr('═')}`)
  console.log('  B0 orchestration runs complete')
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
