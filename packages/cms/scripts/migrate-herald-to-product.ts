/**
 * Copy UI content from Herald Sanity → another product's project (same schema):
 * all published uiTheme + library documents (preserving _id), then a product Config
 * cloned from Herald's heraldConfig userInterface (theme + library refs stay valid).
 *
 * Usage (from repo root, Atta creds in env):
 *   set -a && source apps/atta-ai/web/.env.local && set +a
 *   export MIGRATE_SOURCE_PROJECT_ID=e9gbd2d1 MIGRATE_PRODUCT=atta
 *   cd packages/cms && bun run migrate:herald-to-product
 *
 * Env:
 *   MIGRATE_PRODUCT          — required: atta | vitakka | vada
 *   SANITY_PROJECT_ID        — destination project (e.g. Atta)
 *   SANITY_DATASET           — default production
 *   SANITY_API_TOKEN         — destination write token (Editor+)
 *   MIGRATE_SOURCE_PROJECT_ID — default e9gbd2d1 (Herald)
 *   MIGRATE_SOURCE_DATASET   — default production
 *   MIGRATE_SOURCE_TOKEN     — optional; source read token if dataset is private
 */

import { createClient, type SanityClient } from '@sanity/client'

const HERALD_PROJECT_ID = 'e9gbd2d1'

const PRODUCT_DEST: Record<string, { _type: string; _id: string }> = {
  atta: { _type: 'attaConfig', _id: 'attaConfig' },
  vitakka: { _type: 'vitakkaConfig', _id: 'vitakkaConfig' },
  vada: { _type: 'vadaConfig', _id: 'vadaConfig' }
}

const SYSTEM_KEYS = new Set(['_rev', '_createdAt', '_updatedAt', '_system', '_weak', '_key'])

function stripForImport(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    if (SYSTEM_KEYS.has(k)) continue
    out[k] = v
  }
  return out
}

function sourceClient(): SanityClient {
  const projectId = process.env.MIGRATE_SOURCE_PROJECT_ID ?? HERALD_PROJECT_ID
  const dataset = process.env.MIGRATE_SOURCE_DATASET ?? 'production'
  const token = process.env.MIGRATE_SOURCE_TOKEN
  return createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token: token || undefined,
    useCdn: false
  })
}

function targetClient(): SanityClient {
  const projectId = process.env.SANITY_PROJECT_ID
  const dataset = process.env.SANITY_DATASET ?? 'production'
  const token = process.env.SANITY_API_TOKEN
  if (!projectId || !token) {
    console.error('Missing SANITY_PROJECT_ID or SANITY_API_TOKEN (destination project).')
    process.exit(1)
  }
  return createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token,
    useCdn: false
  })
}

const PUBLISHED = `!(_id in path("drafts.**"))`

async function migrate() {
  const productKey = (process.env.MIGRATE_PRODUCT ?? '').toLowerCase()
  const dest = PRODUCT_DEST[productKey]
  if (!dest) {
    console.error(
      `MIGRATE_PRODUCT must be one of: ${Object.keys(PRODUCT_DEST).join(', ')} (got "${process.env.MIGRATE_PRODUCT}")`
    )
    process.exit(1)
  }

  const src = sourceClient()
  const dst = targetClient()

  console.info(
    `Source: ${process.env.MIGRATE_SOURCE_PROJECT_ID ?? HERALD_PROJECT_ID} → Target: ${process.env.SANITY_PROJECT_ID}`
  )
  console.info(`Product config: ${dest._type} (${dest._id})`)

  const themes = await src.fetch(`*[_type == "uiTheme" && ${PUBLISHED}]`)
  const libraries = await src.fetch(`*[_type == "library" && ${PUBLISHED}]`)

  console.info(`Found ${themes.length} themes, ${libraries.length} libraries`)

  for (const raw of themes as Record<string, unknown>[]) {
    const doc = stripForImport(raw) as { _id?: string; name?: string }
    await dst.createOrReplace(doc)
    console.info(`  Theme: ${doc.name ?? doc._id}`)
  }

  for (const raw of libraries as Record<string, unknown>[]) {
    const doc = stripForImport(raw) as { _id?: string; name?: string }
    await dst.createOrReplace(doc)
    console.info(`  Library: ${doc.name ?? doc._id}`)
  }

  const heraldCfg = (await src.fetch(
    `*[_type == "heraldConfig" && _id == "heraldConfig" && ${PUBLISHED}][0]{ userInterface }`
  )) as { userInterface?: Record<string, unknown> } | null

  if (!heraldCfg?.userInterface) {
    console.error('Herald heraldConfig not found or has no userInterface. Aborting before writing product config.')
    process.exit(1)
  }

  await dst.createOrReplace({
    _id: dest._id,
    _type: dest._type,
    userInterface: heraldCfg.userInterface
  })
  console.info(`  Created ${dest._type} from Herald userInterface.`)

  console.info('Done.')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
