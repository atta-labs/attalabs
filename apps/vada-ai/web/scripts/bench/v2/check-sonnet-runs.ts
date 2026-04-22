// Utility: check existing Sonnet B0 orchestration runs in DB
import { config } from 'dotenv'
config({ path: '.env.local' })
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

const rows = await db
  .select()
  .from(schema.v2OrchestrationRuns)
  .where(eq(schema.v2OrchestrationRuns.modelId, 'claude-sonnet-4-6'))
  .orderBy(schema.v2OrchestrationRuns.questionId, schema.v2OrchestrationRuns.runIndex)

console.log(`\nExisting Sonnet B0 runs: ${rows.length}`)
for (const r of rows) {
  console.log(`  [${r.questionId}] run${r.runIndex} → ${r.terminalState} (${(r.elapsedMs / 1000).toFixed(1)}s)`)
}

process.exit(0)
