/**
 * Seed Sanity CMS with library documents and a product UI config singleton.
 * Also logs existing themes so we can pick one for the config.
 *
 * Usage: cd packages/cms && npx tsx scripts/seed-ui.ts
 *
 * Target project via SANITY_* env. Which singleton to create:
 *   SANITY_SEED_PRODUCT=herald | atta | vinaya | vada   (default: herald)
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false
})

const SEED_PRODUCT = (process.env.SANITY_SEED_PRODUCT ?? 'herald').toLowerCase()

const PRODUCT_CONFIGS: Record<string, { _type: string; _id: string }> = {
  herald: { _type: 'heraldConfig', _id: 'heraldConfig' },
  atta: { _type: 'attaConfig', _id: 'attaConfig' },
  vinaya: { _type: 'vinayaConfig', _id: 'vinayaConfig' },
  vada: { _type: 'vadaConfig', _id: 'vadaConfig' }
}

const LIBRARIES = [
  {
    _id: 'library-basic',
    _type: 'library',
    id: 'basic',
    name: 'Standard',
    description: 'Clean, minimal. Soft shadows, rounded corners.',
    style: 'Modern / Minimal',
    order: 1
  },
  {
    _id: 'library-retro',
    _type: 'library',
    id: 'retro',
    name: 'Retro',
    description: 'Bold borders, heavy shadows. 80s/cyberpunk aesthetic.',
    style: 'Neobrutalist / Retro',
    order: 2
  },
  {
    _id: 'library-animate',
    _type: 'library',
    id: 'animate',
    name: 'Animated',
    description: 'Motion-enhanced interactions. Scale on hover, spring on tap.',
    style: 'Motion-Enhanced',
    order: 3
  },
  {
    _id: 'library-brutal',
    _type: 'library',
    id: 'brutal',
    name: 'Brutal',
    description: 'Neobrutalism. Hard offset shadows, thick borders.',
    style: 'Neobrutalist / Stark',
    order: 4
  }
]

async function seed() {
  const productCfg = PRODUCT_CONFIGS[SEED_PRODUCT]
  if (!productCfg) {
    console.error(
      `Invalid SANITY_SEED_PRODUCT="${process.env.SANITY_SEED_PRODUCT}". Expected one of: ${Object.keys(PRODUCT_CONFIGS).join(', ')}`
    )
    process.exit(1)
  }

  console.info(`Seeding libraries (product: ${SEED_PRODUCT})...`)

  for (const lib of LIBRARIES) {
    await client.createOrReplace(lib)
    console.info(`  Created library: ${lib.name} (${lib.id})`)
  }

  // Find first available theme to use as default
  const themes = await client.fetch('*[_type == "uiTheme"] { _id, name } | order(name asc)')
  console.info(`\nFound ${themes.length} themes:`)
  for (const t of themes) {
    console.info(`  - ${t.name} (${t._id})`)
  }

  const defaultTheme = themes[0]
  if (!defaultTheme) {
    console.info('\nNo themes found! Create a theme in Sanity Studio first, then re-run.')
    return
  }

  console.info(`\nUsing "${defaultTheme.name}" as default theme for ${productCfg._id}.`)

  await client.createOrReplace({
    _id: productCfg._id,
    _type: productCfg._type,
    userInterface: {
      theme: { _type: 'reference', _ref: defaultTheme._id },
      colorScheme: 'dark',
      library: { _type: 'reference', _ref: 'library-basic' }
    }
  })
  console.info(`Created ${productCfg._type} singleton (${productCfg._id}).`)

  console.info('\nDone! Verify in Sanity Studio at http://localhost:3333')
}

seed().catch(console.error)
