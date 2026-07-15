/**
 * Seed Sanity CMS with branding documents and upload logo/favicon assets.
 *
 * Usage (run from packages/cms/):
 *   SANITY_PROJECT_ID=<id> SANITY_API_TOKEN=<token> SANITY_SEED_PRODUCT=atta bun run scripts/seed-branding.ts
 *
 * Products and their project IDs:
 *   herald   — e9gbd2d1
 *   atta     — 892o2m9f
 *   vada     — ofnj2ojb
 *   vinaya   — o56nzgrr
 *   attalabs — l5n0n8nn
 *
 * Expects assets at: ~/Downloads/tmp 2/logos-bundle/{product}/
 *   {product}-outline-light.svg
 *   {product}-outline-dark.svg
 *   {product}-solid-light.svg
 *   {product}-solid-dark.svg
 *   {product}-favicon.svg
 *   {product}-favicon.ico   (attalabs: favicon.ico — no prefix)
 *   {product}-apple-touch-icon.png   (attalabs: apple-touch-icon.png — no prefix)
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@sanity/client'

// ── Client ─────────────────────────────────────────────────────────────────

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false
})

const SEED_PRODUCT = (process.env.SANITY_SEED_PRODUCT ?? 'herald').toLowerCase() as
  | 'herald'
  | 'atta'
  | 'vada'
  | 'vinaya'
  | 'attalabs'

const LOGOS_DIR = path.join(os.homedir(), 'Downloads', 'tmp 2', 'logos-bundle')

// ── Brand identity data ─────────────────────────────────────────────────────

const SHARED_VARIANT_TEXT = {
  outlineDescription:
    'Thin curved stroke blades with a soft glow filter. Interior element is rendered with fine detail. This is the atmospheric, detailed version.',
  outlineUseCases:
    'Landing pages, hero sections, marketing materials, OG images, about pages, documentation headers — any context where the logo renders at 48px or larger.',
  outlineMinSizePx: 48,
  solidDescription:
    'Same geometry as outline, but blades are filled masses. Interior element is a filled shape. No glow filters, no transparency. Holds at small sizes.',
  solidUseCases:
    'Favicons, browser tabs, app icons, nav bars, loading screens, watermarks — any context below 48px or where glow filters will not render cleanly (email, PDF, print).',
  solidMinSizePx: 16,
  clearSpace: 'Clear zone equal to the height of the interior element on all sides',
  forbidden: [
    'Do not rotate the logo',
    'Do not stretch or distort the proportions',
    'Do not straighten the blade curves',
    'Do not use outline below 48px',
    'Do not use solid in hero/marketing contexts where outline is available',
    'Do not add drop shadows, borders, or effects beyond what is defined in the outline variant',
    'Do not separate the interior element from the blades'
  ]
}

const PRODUCT_DATA = {
  herald: {
    _id: 'branding-herald',
    _type: 'branding',
    productId: 'herald',
    productName: 'Herald',
    paliRoot: 'Herald',
    paliMeaning: 'announcement',
    tagline: 'Forensic audit and signal detection for public figures',
    shapeNotes: 'Blade curves are organic and intentional — they must not be straightened.',
    ...SHARED_VARIANT_TEXT
  },
  atta: {
    _id: 'branding-atta',
    _type: 'branding',
    productId: 'atta',
    productName: 'Attā',
    paliRoot: 'Attā (अत्ता)',
    paliMeaning: 'self',
    tagline: 'Personal AI orchestration hub',
    bladeDirection: 'apex-up',
    interiorElement: 'Eye — almond ellipse with pupil',
    interiorMeaning: 'The self looking inward, awareness observing itself',
    shapeNotes:
      'Two curved blades forming a Λ (the letter A without its crossbar). Inside the Λ sits an eye — an almond-shaped ellipse with a pupil at center. The blade curves are organic and intentional — they must not be straightened.',
    ...SHARED_VARIANT_TEXT
  },
  vada: {
    _id: 'branding-vada',
    _type: 'branding',
    productId: 'vada',
    productName: 'Vādā',
    paliRoot: 'Vādā',
    paliMeaning: 'deliberation',
    tagline: 'AI deliberation engine for structured multi-perspective thinking',
    bladeDirection: 'apex-down',
    interiorElement: 'Two circles connected by exchange arcs',
    interiorMeaning: 'Conversation, dialogue between two minds',
    shapeNotes:
      'Two curved blades forming a V (apex down). Inside sits two connected circles joined by exchange arcs, representing dialogue. The blade curves are organic and intentional — they must not be straightened.',
    ...SHARED_VARIANT_TEXT
  },
  vinaya: {
    _id: 'branding-vinaya',
    _type: 'branding',
    productId: 'vinaya',
    productName: 'Vinaya',
    paliRoot: 'Vinaya',
    paliMeaning: 'discipline / rules of conduct',
    tagline: 'Discipline for the AI era',
    bladeDirection: 'apex-down',
    interiorElement: 'Target — concentric rings with crosshairs',
    interiorMeaning: 'Focus, thought applied to its object',
    shapeNotes:
      'Two curved blades forming a V (apex down). Inside sits a target made of concentric rings with crosshairs. The blade curves are organic and intentional — they must not be straightened.',
    ...SHARED_VARIANT_TEXT
  },
  attalabs: {
    _id: 'branding-attalabs',
    _type: 'branding',
    productId: 'attalabs',
    productName: 'AttaLabs',
    paliRoot: 'AttaLabs',
    paliMeaning: 'self lab',
    tagline: 'A lab building thinking tools',
    shapeNotes: 'Blade curves are organic and intentional — they must not be straightened.',
    ...SHARED_VARIANT_TEXT
  }
} as const

// ── Per-product asset filename config ───────────────────────────────────────

type ProductAssetConfig = {
  faviconIcoFilename: string
  appleTouchFilename: string
}

const ASSET_CONFIG: Record<string, ProductAssetConfig> = {
  herald: { faviconIcoFilename: 'herald-favicon.ico', appleTouchFilename: 'herald-apple-touch-icon.png' },
  atta: { faviconIcoFilename: 'atta-favicon.ico', appleTouchFilename: 'atta-apple-touch-icon.png' },
  vada: { faviconIcoFilename: 'vada-favicon.ico', appleTouchFilename: 'vada-apple-touch-icon.png' },
  vinaya: { faviconIcoFilename: 'vinaya-favicon.ico', appleTouchFilename: 'vinaya-apple-touch-icon.png' },
  attalabs: { faviconIcoFilename: 'favicon.ico', appleTouchFilename: 'apple-touch-icon.png' }
}

// ── Asset helpers ───────────────────────────────────────────────────────────

function readAsset(filePath: string): Buffer | null {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ Not found: ${filePath}`)
    return null
  }
  return fs.readFileSync(filePath)
}

async function uploadFile(buf: Buffer, filename: string, contentType: string): Promise<string | null> {
  try {
    const asset = await client.assets.upload('file', buf, { filename, contentType })
    console.log(`  ✓ Uploaded file: ${filename} → ${asset._id}`)
    return asset._id
  } catch (err) {
    console.error(`  ✗ Failed to upload file ${filename}:`, err)
    return null
  }
}

async function uploadImage(buf: Buffer, filename: string): Promise<string | null> {
  try {
    const asset = await client.assets.upload('image', buf, { filename, contentType: 'image/png' })
    console.log(`  ✓ Uploaded image: ${filename} → ${asset._id}`)
    return asset._id
  } catch (err) {
    console.error(`  ✗ Failed to upload image ${filename}:`, err)
    return null
  }
}

function fileRef(assetId: string) {
  return { _type: 'file', asset: { _type: 'reference', _ref: assetId } }
}

function imageRef(assetId: string) {
  return { _type: 'image', asset: { _type: 'reference', _ref: assetId } }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding branding for product: ${SEED_PRODUCT}`)
  console.log(`Project: ${process.env.SANITY_PROJECT_ID}\n`)

  const doc: Record<string, unknown> = { ...PRODUCT_DATA[SEED_PRODUCT] }
  const productDir = path.join(LOGOS_DIR, SEED_PRODUCT)
  const assetConfig = ASSET_CONFIG[SEED_PRODUCT]

  if (!fs.existsSync(productDir)) {
    console.error(`Assets directory not found: ${productDir}`)
    process.exit(1)
  }

  const p = SEED_PRODUCT

  // Upload SVG logos
  console.log('Uploading SVG logos...')
  const svgFiles = [
    { field: 'logoOutlineLight', filename: `${p}-outline-light.svg` },
    { field: 'logoOutlineDark', filename: `${p}-outline-dark.svg` },
    { field: 'logoSolidLight', filename: `${p}-solid-light.svg` },
    { field: 'logoSolidDark', filename: `${p}-solid-dark.svg` },
    { field: 'logoFavicon', filename: `${p}-favicon.svg` }
  ]

  for (const { field, filename } of svgFiles) {
    const buf = readAsset(path.join(productDir, filename))
    if (!buf) continue
    const assetId = await uploadFile(buf, filename, 'image/svg+xml')
    if (assetId) doc[field] = fileRef(assetId)
  }

  // Upload apple-touch-icon (PNG image)
  console.log('\nUploading apple-touch-icon...')
  const appleTouchBuf = readAsset(path.join(productDir, assetConfig.appleTouchFilename))
  if (appleTouchBuf) {
    const assetId = await uploadImage(appleTouchBuf, `${p}-apple-touch-icon.png`)
    if (assetId) doc.appleTouchIcon = imageRef(assetId)
  }

  // Upload favicon.ico (file asset, not image)
  console.log('\nUploading favicon.ico...')
  const icoBuf = readAsset(path.join(productDir, assetConfig.faviconIcoFilename))
  if (icoBuf) {
    const assetId = await uploadFile(icoBuf, `${p}-favicon.ico`, 'image/x-icon')
    if (assetId) doc.faviconIco = fileRef(assetId)
  }

  // Create or replace the branding document
  console.log('\nCreating branding document...')
  const result = await client.createOrReplace(doc as Parameters<typeof client.createOrReplace>[0])
  console.log(`✓ Branding document saved: ${result._id}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
