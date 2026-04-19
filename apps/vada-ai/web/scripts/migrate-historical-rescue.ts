// One-time migration: rewrite historical conclusion rows whose
// `originalJson.recommendation` / `revisedJson.recommendation` still contains
// a stringified-JSON salvage artifact (the bug traced in session
// 4697f15c-92b7-4b2e-8101-5a1cc69340b6 — see memory
// `project_vada_shopping_cart_regression.md`).
//
// After this runs, the display-time rescue in `src/engine/conclusion-rescue.ts`
// becomes redundant for historical rows and can be deleted. The write-time
// containment added in 2026-04-19 prevents new rows from ever needing rescue.
//
// Usage:
//   bun run apps/vada-ai/web/scripts/migrate-historical-rescue.ts --dry-run
//   bun run apps/vada-ai/web/scripts/migrate-historical-rescue.ts
//
// Idempotent — re-running is a no-op because the rescue returns `null` for
// already-clean rows.

import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { conclusions } from '../src/db/schema'
import { extractRenderableConclusion } from '../src/engine/conclusion-rescue'

config({ path: '.env.local' })

const DRY = process.argv.includes('--dry-run')

async function main() {
  const db = drizzle(neon(process.env.DATABASE_URL!))
  const rows = await db.select().from(conclusions)

  let checked = 0
  let rewrittenOriginal = 0
  let rewrittenRevised = 0
  const touchedIds: string[] = []

  for (const row of rows) {
    checked++
    const originalJson = row.originalJson as Record<string, unknown> | null
    const revisedJson = row.revisedJson as Record<string, unknown> | null

    let nextOriginal = originalJson
    let nextRevised = revisedJson
    let changed = false

    if (originalJson && typeof originalJson.recommendation === 'string') {
      const rescued = extractRenderableConclusion({ originalJson, revisedJson: null })
      if (rescued && rescued !== originalJson && typeof rescued.recommendation === 'string') {
        nextOriginal = rescued
        rewrittenOriginal++
        changed = true
      }
    }

    if (revisedJson && typeof revisedJson.recommendation === 'string') {
      const rescued = extractRenderableConclusion({ originalJson: null, revisedJson })
      if (rescued && rescued !== revisedJson && typeof rescued.recommendation === 'string') {
        nextRevised = rescued
        rewrittenRevised++
        changed = true
      }
    }

    if (changed) {
      touchedIds.push(row.id)
      if (!DRY) {
        await db
          .update(conclusions)
          .set({ originalJson: nextOriginal, revisedJson: nextRevised })
          .where(eq(conclusions.id, row.id))
      }
    }
  }

  console.log('---')
  console.log(`Mode: ${DRY ? 'DRY RUN (no writes)' : 'LIVE (rows updated)'}`)
  console.log(`Rows checked: ${checked}`)
  console.log(`Rewritten originalJson: ${rewrittenOriginal}`)
  console.log(`Rewritten revisedJson: ${rewrittenRevised}`)
  console.log(`Touched conclusion ids: ${touchedIds.length}`)
  if (touchedIds.length > 0 && touchedIds.length <= 20) {
    for (const id of touchedIds) console.log(`  ${id}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
