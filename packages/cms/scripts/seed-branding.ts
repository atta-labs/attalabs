/**
 * Seed Sanity CMS with branding documents and upload logo/favicon assets.
 *
 * Usage (run from packages/cms/):
 *   SANITY_PROJECT_ID=<id> SANITY_API_TOKEN=<token> SANITY_SEED_PRODUCT=atta bun run scripts/seed-branding.ts
 *
 * Products and their project IDs:
 *   herald   — e9gbd2d1   (no assets yet, document shell only)
 *   atta     — 892o2m9f
 *   vada     — ofnj2ojb
 *   vitakka  — o56nzgrr
 *
 * Expects assets at: ~/Downloads/logos/{product}/
 *   outline/{product}-outline-{light|dark}.svg
 *   solid/{product}-solid-{light|dark}.svg
 *   lockup/{product}-lockup-{outline|solid}-{light|dark}.svg
 *   favicon/
 *     {product}-light.ico, {product}-dark.ico, {product}-apple-touch-180.png
 *     light/{product}-{16|32|48|64|128|256|512}.png
 *     dark/{product}-{16|32|48|64|128|256|512}.png
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
  | 'vitakka'

const LOGOS_DIR = path.join(os.homedir(), 'Downloads', 'logos')

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
    shapeNotes: 'Logo TBD. Blade curves are organic and intentional — they must not be straightened.',
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
  vitakka: {
    _id: 'branding-vitakka',
    _type: 'branding',
    productId: 'vitakka',
    productName: 'Vitakka',
    paliRoot: 'Vitakka',
    paliMeaning: 'applied thought',
    tagline: 'Focus engine — thought applied to its object',
    bladeDirection: 'apex-down',
    interiorElement: 'Target — concentric rings with crosshairs',
    interiorMeaning: 'Focus, thought applied to its object',
    shapeNotes:
      'Two curved blades forming a V (apex down). Inside sits a target made of concentric rings with crosshairs. The blade curves are organic and intentional — they must not be straightened.',
    ...SHARED_VARIANT_TEXT
  }
} as const

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

// ── Favicon set upload ──────────────────────────────────────────────────────

const FAVICON_PNG_SIZES: Array<{ field: string; size: number }> = [
  { field: 'png16', size: 16 },
  { field: 'png32', size: 32 },
  { field: 'png48', size: 48 },
  { field: 'png64', size: 64 },
  { field: 'png128', size: 128 },
  { field: 'png256', size: 256 },
  { field: 'png512', size: 512 }
]

async function uploadFaviconSet(product: string, scheme: 'light' | 'dark'): Promise<Record<string, unknown>> {
  const faviconRoot = path.join(LOGOS_DIR, product, 'favicon')
  const pngDir = path.join(faviconRoot, scheme)
  const set: Record<string, unknown> = {}

  // .ico lives at favicon root: {product}-{scheme}.ico
  const icoFilename = `${product}-${scheme}.ico`
  const icoBuf = readAsset(path.join(faviconRoot, icoFilename))
  if (icoBuf) {
    const assetId = await uploadFile(icoBuf, icoFilename, 'image/x-icon')
    if (assetId) set.ico = fileRef(assetId)
  }

  // PNGs live at favicon/{scheme}/{product}-{size}.png
  for (const { field, size } of FAVICON_PNG_SIZES) {
    const filename = `${product}-${size}.png`
    const buf = readAsset(path.join(pngDir, filename))
    if (!buf) continue
    const assetId = await uploadImage(buf, `${product}-${scheme}-${size}.png`)
    if (assetId) set[field] = imageRef(assetId)
  }

  return set
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding branding for product: ${SEED_PRODUCT}`)
  console.log(`Project: ${process.env.SANITY_PROJECT_ID}\n`)

  const doc: Record<string, unknown> = { ...PRODUCT_DATA[SEED_PRODUCT] }

  const hasAssets = SEED_PRODUCT !== 'herald'

  if (hasAssets) {
    const productDir = path.join(LOGOS_DIR, SEED_PRODUCT)
    if (!fs.existsSync(productDir)) {
      console.error(`Assets directory not found: ${productDir}`)
      process.exit(1)
    }

    // Upload SVG logos — mark variants + lockup (Logo Full) variants
    console.log('Uploading SVG logos...')
    const p = SEED_PRODUCT
    const svgFiles = [
      { field: 'logoOutlineLight', src: `outline/${p}-outline-light.svg` },
      { field: 'logoOutlineDark', src: `outline/${p}-outline-dark.svg` },
      { field: 'logoSolidLight', src: `solid/${p}-solid-light.svg` },
      { field: 'logoSolidDark', src: `solid/${p}-solid-dark.svg` },
      { field: 'logoLockupOutlineLight', src: `lockup/${p}-lockup-outline-light.svg` },
      { field: 'logoLockupOutlineDark', src: `lockup/${p}-lockup-outline-dark.svg` },
      { field: 'logoLockupSolidLight', src: `lockup/${p}-lockup-solid-light.svg` },
      { field: 'logoLockupSolidDark', src: `lockup/${p}-lockup-solid-dark.svg` }
    ]

    for (const { field, src } of svgFiles) {
      const buf = readAsset(path.join(productDir, src))
      if (!buf) continue
      const filename = path.basename(src)
      const assetId = await uploadFile(buf, filename, 'image/svg+xml')
      if (assetId) doc[field] = fileRef(assetId)
    }

    // Upload shared apple-touch-icon (single asset, not per-scheme)
    console.log('\nUploading apple-touch-icon...')
    const appleTouchFilename = `${p}-apple-touch-180.png`
    const appleTouchBuf = readAsset(path.join(productDir, 'favicon', appleTouchFilename))
    if (appleTouchBuf) {
      const assetId = await uploadImage(appleTouchBuf, appleTouchFilename)
      if (assetId) doc.appleTouchIcon = imageRef(assetId)
    }

    // Upload favicon sets
    console.log('\nUploading favicon set — light...')
    doc.faviconLight = await uploadFaviconSet(SEED_PRODUCT, 'light')

    console.log('\nUploading favicon set — dark...')
    doc.faviconDark = await uploadFaviconSet(SEED_PRODUCT, 'dark')
  } else {
    console.log('Herald: skipping asset upload (logos TBD)')
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
