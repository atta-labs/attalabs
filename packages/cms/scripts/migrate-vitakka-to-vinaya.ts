/**
 * Copy Vitakka's Sanity documents (vitakkaConfig, branding-vitakka) to Vinaya's
 * new document IDs (vinayaConfig, branding-vinaya) — same project (o56nzgrr).
 * Vitakka is shelved and its "V" mark fits Vinaya's initial, so this is a
 * rename-in-place, not a re-upload: theme/library refs and every logo/favicon
 * asset reference carry over verbatim (D-122).
 *
 * Idempotent: if the source documents are already gone and the destination
 * documents already exist, the script reports "already migrated" and exits 0
 * instead of erroring. Running it twice in a row is safe.
 *
 * Usage (from repo root):
 *   set -a && source tools/admin/.env.local && set +a
 *   export SANITY_PROJECT_ID=o56nzgrr SANITY_API_TOKEN="$SANITY_API_TOKEN_VINAYA"
 *   cd packages/cms && bun run migrate:vitakka-to-vinaya
 *
 * (Not apps/vitakka-ai/web/.env.local — that file now holds only a
 * read-only legacy Vitakka token targeting the same project; a write
 * token lives in tools/admin's per-project env, keyed SANITY_API_TOKEN_VINAYA.)
 *
 * Env:
 *   SANITY_PROJECT_ID — o56nzgrr (Vitakka/Vinaya's shared project)
 *   SANITY_DATASET    — default production
 *   SANITY_API_TOKEN  — write token (Editor+)
 */

import { createClient, type SanityClient } from '@sanity/client'

function client(): SanityClient {
  const projectId = process.env.SANITY_PROJECT_ID
  const dataset = process.env.SANITY_DATASET ?? 'production'
  const token = process.env.SANITY_API_TOKEN
  if (!projectId || !token) {
    console.error('Missing SANITY_PROJECT_ID or SANITY_API_TOKEN.')
    process.exit(1)
  }
  return createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })
}

const SYSTEM_KEYS = new Set(['_id', '_type', '_rev', '_createdAt', '_updatedAt'])

function stripSystemKeys(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    if (SYSTEM_KEYS.has(k)) continue
    out[k] = v
  }
  return out
}

// Belt-and-suspenders with migrate-herald-to-product.ts's PUBLISHED filter:
// these queries match _id exactly, and a draft's _id is always prefixed
// "drafts." in Sanity, so an exact match against the bare id can never
// resolve a draft — the filter can never actually exclude anything here,
// but it documents that intent explicitly rather than relying on the
// id-shape invariant silently.
const PUBLISHED = `!(_id in path("drafts.**"))`

async function migrate() {
  const c = client()

  const [vitakkaConfig, vitakkaBranding, existingVinayaConfig, existingVinayaBranding] = await Promise.all([
    c.fetch(`*[_id == "vitakkaConfig" && ${PUBLISHED}][0]`),
    c.fetch(`*[_id == "branding-vitakka" && ${PUBLISHED}][0]`),
    c.fetch(`*[_id == "vinayaConfig" && ${PUBLISHED}][0]`),
    c.fetch(`*[_id == "branding-vinaya" && ${PUBLISHED}][0]`)
  ])

  if (!vitakkaConfig && !vitakkaBranding) {
    if (existingVinayaConfig && existingVinayaBranding) {
      console.info(
        'Already migrated: vitakkaConfig/branding-vitakka not found, and vinayaConfig/branding-vinaya already exist. Nothing to do.'
      )
      process.exit(0)
    }
    console.error(
      'Source documents (vitakkaConfig, branding-vitakka) not found, and destination documents are also missing. Cannot migrate — nothing to copy from.'
    )
    process.exit(1)
  }

  if (!vitakkaConfig || !vitakkaBranding) {
    console.error(
      `Partial source state: vitakkaConfig ${vitakkaConfig ? 'found' : 'MISSING'}, branding-vitakka ${vitakkaBranding ? 'found' : 'MISSING'}. Aborting — will not proceed on partial state.`
    )
    process.exit(1)
  }

  console.info('Source verified: vitakkaConfig and branding-vitakka both present.')

  // Step 2 — copy userInterface verbatim. Theme/library refs point at the
  // central attalabs project (D-060) and stay valid across the rename.
  const vinayaConfigDoc = {
    _id: 'vinayaConfig',
    _type: 'vinayaConfig',
    userInterface: vitakkaConfig.userInterface
  }
  await c.createOrReplace(vinayaConfigDoc)
  console.info('  vinayaConfig created/replaced — userInterface copied verbatim from vitakkaConfig.')

  // Step 3 — copy branding wholesale, override identity fields only. Every
  // logo/favicon asset _ref carries over unchanged (same project, no re-upload).
  const brandingRest = stripSystemKeys(vitakkaBranding)
  const brandingVinayaDoc = {
    ...brandingRest,
    _id: 'branding-vinaya',
    _type: 'branding',
    productId: 'vinaya',
    productName: 'Vinaya',
    paliRoot: 'Vinaya',
    paliMeaning: 'discipline / rules of conduct',
    tagline: 'Discipline for the AI era'
  }
  await c.createOrReplace(brandingVinayaDoc)
  console.info('  branding-vinaya created/replaced — logo/favicon assets reused verbatim from branding-vitakka.')

  // Verify before deleting the legacy documents.
  const [verifyConfig, verifyBranding] = await Promise.all([
    c.fetch(`*[_id == "vinayaConfig"][0]`),
    c.fetch(`*[_id == "branding-vinaya"][0]`)
  ])
  if (!verifyConfig || !verifyBranding) {
    console.error(
      'Post-write verification failed — vinayaConfig/branding-vinaya not found after write. NOT deleting legacy documents.'
    )
    process.exit(1)
  }
  console.info('Post-write verification passed: vinayaConfig and branding-vinaya both present.')

  // Step 4 — delete the legacy documents now that the new ones are confirmed.
  await c.delete('vitakkaConfig')
  await c.delete('branding-vitakka')
  console.info('  Deleted legacy vitakkaConfig and branding-vitakka documents.')

  console.info('Migration complete.')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
