/**
 * Smoke test for vada__consult.
 *
 * Prerequisites:
 *   1. Run migration: DATABASE_URL=... bun packages/mcp-server/scripts/migrate.ts
 *   2. Set env vars: ANTHROPIC_API_KEY, DATABASE_URL
 *
 * Run:
 *   ANTHROPIC_API_KEY=... DATABASE_URL=... bun packages/mcp-server/scripts/smoke-test.ts
 */
import { runConsult } from '../src/tools/consult.js'
import { createDb } from '@atta/db'
import { mcpSessions } from '../src/schema.js'
import { eq } from 'drizzle-orm'

const apiKey = process.env.ANTHROPIC_API_KEY
const dbUrl = process.env.DATABASE_URL

if (!apiKey) {
  console.error('ANTHROPIC_API_KEY required')
  process.exit(1)
}

console.log('='.repeat(60))
console.log('vada__consult smoke test')
console.log('='.repeat(60))

const prompt = 'Should early-stage startups write tests? Argue against it.'
const reviewerProfile = 'critic' as const

console.log(`\nPrompt: ${prompt}`)
console.log(`Reviewer: ${reviewerProfile}\n`)

const result = await runConsult({ prompt, reviewer_profile: reviewerProfile }, apiKey)

console.log('--- Response ---')
console.log(result.response)
console.log()
console.log('--- Metadata ---')
console.log('Session ID:  ', result.session_id)
console.log('Session URL: ', result.session_url)
console.log('Cost breakdown:')
console.log('  estimated_usd:', result.cost_breakdown.estimated_usd.toFixed(4))
console.log('  tokens_input: ', result.cost_breakdown.tokens_input)
console.log('  tokens_output:', result.cost_breakdown.tokens_output)
console.log('  duration_ms:  ', result.cost_breakdown.duration_ms)

if (dbUrl) {
  console.log('\n--- DB confirmation ---')
  const db = createDb(dbUrl)
  const rows = await db.select().from(mcpSessions).where(eq(mcpSessions.id, result.session_id))
  if (rows.length > 0) {
    const row = rows[0]!
    console.log('Row found:')
    console.log('  id:              ', row.id)
    console.log('  tool_name:       ', row.toolName) // should be vada__deliberate_brokered
    console.log('  reviewer_profile:', row.reviewerProfile)
    console.log('  tokens_input:    ', row.tokensInput)
    console.log('  tokens_output:   ', row.tokensOutput)
    console.log('  cost_usd:        ', row.costUsd)
    console.log('  duration_ms:     ', row.durationMs)
    console.log('  created_at:      ', row.createdAt)
  } else {
    console.error('ERROR: row not found in DB after insert')
    process.exit(1)
  }
} else {
  console.log('\n[DB] DATABASE_URL not set — skipping DB confirmation')
}

console.log('\n✓ Smoke test complete')
