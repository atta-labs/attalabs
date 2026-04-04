/**
 * Seed Sanity CMS with library documents and heraldConfig singleton.
 * Also logs existing themes so we can pick one for heraldConfig.
 *
 * Usage: cd packages/cms && npx tsx scripts/seed-ui.ts
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false
})

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
  console.log('Seeding libraries...')

  for (const lib of LIBRARIES) {
    await client.createOrReplace(lib)
    console.log(`  Created library: ${lib.name} (${lib.id})`)
  }

  // Find first available theme to use as default
  const themes = await client.fetch('*[_type == "uiTheme"] { _id, name } | order(name asc)')
  console.log(`\nFound ${themes.length} themes:`)
  for (const t of themes) {
    console.log(`  - ${t.name} (${t._id})`)
  }

  const defaultTheme = themes[0]
  if (!defaultTheme) {
    console.log('\nNo themes found! Create a theme in Sanity Studio first, then re-run.')
    return
  }

  console.log(`\nUsing "${defaultTheme.name}" as default theme for heraldConfig.`)

  // Create heraldConfig singleton
  await client.createOrReplace({
    _id: 'heraldConfig',
    _type: 'heraldConfig',
    userInterface: {
      theme: { _type: 'reference', _ref: defaultTheme._id },
      colorScheme: 'dark',
      library: { _type: 'reference', _ref: 'library-basic' }
    }
  })
  console.log('Created heraldConfig singleton.')

  console.log('\nDone! Verify in Sanity Studio at http://localhost:3333')
}

seed().catch(console.error)
