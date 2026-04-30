/**
 * Smoke test for vada__deliberate.
 *
 * Prerequisites:
 *   1. Run migration: DATABASE_URL=... bun packages/mcp-server/scripts/migrate.ts
 *   2. Set env vars: ANTHROPIC_API_KEY, DATABASE_URL
 *
 * Run:
 *   ANTHROPIC_API_KEY=... DATABASE_URL=... bun packages/mcp-server/scripts/smoke-deliberate.ts
 */
import { runDeliberate } from '../src/tools/deliberate.js'
import { createDb } from '@atta/db'
import { mcpSessions } from '../src/schema.js'
import { eq } from 'drizzle-orm'

const dbUrl = process.env.DATABASE_URL

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY required')
  process.exit(1)
}

const providerKeys = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  xai: process.env.XAI_API_KEY
}

console.info('='.repeat(60))
console.info('vada__deliberate smoke test')
console.info('='.repeat(60))

const question = 'Should a startup prioritize growth speed or sustainable unit economics in its first two years?'
const team = 'sparring'

console.info(`\nQuestion: ${question}`)
console.info(`Team: ${team}\n`)

const result = await runDeliberate({ question, team }, providerKeys)

console.info('--- Content (first 500 chars) ---')
console.info(result.content.slice(0, 500))
console.info()
console.info('--- Metadata ---')
console.info('Session ID:      ', result.session_id)
console.info('Session URL:     ', result.session_url)
console.info('Terminal state:  ', result.terminal_state)
console.info('Cost breakdown:')
console.info('  estimated_usd:', result.cost_breakdown.estimated_usd.toFixed(4))
console.info('  tokens_input: ', result.cost_breakdown.tokens_input)
console.info('  tokens_output:', result.cost_breakdown.tokens_output)
console.info('  duration_ms:  ', result.cost_breakdown.duration_ms)

if (dbUrl) {
  console.info('\n--- DB confirmation ---')
  const db = createDb(dbUrl)
  const rows = await db.select().from(mcpSessions).where(eq(mcpSessions.id, result.session_id))
  if (rows.length > 0) {
    const row = rows[0]!
    console.info('Row found:')
    console.info('  id:              ', row.id)
    console.info('  tool_name:       ', row.toolName)
    console.info('  terminal_state:  ', row.terminalState)
    console.info('  tokens_input:    ', row.tokensInput)
    console.info('  tokens_output:   ', row.tokensOutput)
    console.info('  cost_usd:        ', row.costUsd)
    console.info('  duration_ms:     ', row.durationMs)
    console.info('  created_at:      ', row.createdAt)
    const transcript = row.transcript as unknown[]
    console.info('  transcript:      ', transcript ? `${transcript.length} entries` : 'null')
    if (!row.transcript) {
      console.error('ERROR: transcript is null — should be non-null for deliberate')
      process.exit(1)
    }
  } else {
    console.error('ERROR: row not found in DB after insert')
    process.exit(1)
  }
} else {
  console.info('\n[DB] DATABASE_URL not set — skipping DB confirmation')
}

console.info('\n✓ Smoke test complete')
