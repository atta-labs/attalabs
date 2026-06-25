import { createClient } from '@sanity/client'
import { PROJECT_IDS } from '../src/client'

const SOURCE_PROJECT_ID = PROJECT_IDS.atta // 892o2m9f
const TARGET_PROJECT_ID = PROJECT_IDS.attalabs // l5n0n8nn

const SYSTEM_KEYS = new Set(['_rev', '_createdAt', '_updatedAt', '_system', '_weak', '_key'])

function stripForImport(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    if (SYSTEM_KEYS.has(k)) continue
    out[k] = v
  }
  return out
}

async function migrate() {
  const token = process.env.SANITY_API_TOKEN_ATTALABS ?? process.env.SANITY_API_TOKEN
  if (!token) {
    console.error('Missing SANITY_API_TOKEN_ATTALABS or SANITY_API_TOKEN in environment.')
    process.exit(1)
  }

  const src = createClient({
    projectId: SOURCE_PROJECT_ID,
    dataset: 'production',
    apiVersion: '2024-01-01',
    token,
    useCdn: false
  })

  const dst = createClient({
    projectId: TARGET_PROJECT_ID,
    dataset: 'production',
    apiVersion: '2024-01-01',
    token,
    useCdn: false
  })

  console.info(`Migrating Themes and Libraries from Atta (${SOURCE_PROJECT_ID}) to Attalabs (${TARGET_PROJECT_ID})`)

  const themes = await src.fetch('*[_type == "uiTheme"]')
  const libraries = await src.fetch('*[_type == "library"]')

  console.info(`Found ${themes.length} themes and ${libraries.length} libraries.`)

  for (const raw of themes as Record<string, unknown>[]) {
    const doc = stripForImport(raw) as { _id: string; name?: string }
    await dst.createOrReplace(doc)
    console.info(`  Theme migrated: ${doc.name ?? doc._id} (${doc._id})`)
  }

  for (const raw of libraries as Record<string, unknown>[]) {
    const doc = stripForImport(raw) as { _id: string; name?: string }
    await dst.createOrReplace(doc)
    console.info(`  Library migrated: ${doc.name ?? doc._id} (${doc._id})`)
  }

  // Also migrate the attalabsConfig branding if it exists on the source project
  const branding = await src.fetch('*[_type == "branding" && _id == "branding-attalabs"][0]')
  if (branding) {
    const doc = stripForImport(branding as Record<string, unknown>) as { _id: string }
    await dst.createOrReplace(doc)
    console.info('  Branding migrated: branding-attalabs')
  }

  console.info('Migration completed successfully.')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
