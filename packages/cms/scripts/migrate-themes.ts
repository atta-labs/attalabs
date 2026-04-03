/**
 * Migrate themes from Summon internal Sanity (rxw4lyny) to Herald Sanity (2tceda2t).
 *
 * Usage: bun run packages/cms/scripts/migrate-themes.ts
 */

import { createClient } from '@sanity/client'

const SOURCE_PROJECT_ID = 'rxw4lyny'
const TARGET_PROJECT_ID = 'e9gbd2d1'
const TARGET_TOKEN = process.env.SANITY_API_TOKEN

if (!TARGET_TOKEN) {
  console.error('Missing SANITY_API_TOKEN env var')
  process.exit(1)
}

const sourceClient = createClient({
  projectId: SOURCE_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false
})

const targetClient = createClient({
  projectId: TARGET_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: TARGET_TOKEN,
  useCdn: false
})

async function migrate() {
  console.log('Fetching themes from Summon internal...')

  const themes = await sourceClient.fetch(
    `*[_type == "uiTheme" && !(_id in path("drafts.**"))] {
      _id,
      _type,
      name,
      description,
      light,
      dark,
      typography,
      spacing,
      shadows
    } | order(name asc)`
  )

  console.log(`Found ${themes.length} themes`)

  // Deduplicate by name (keep first)
  const seen = new Set<string>()
  const unique = themes.filter((t: { name: string }) => {
    if (seen.has(t.name)) {
      console.log(`  Skipping duplicate: ${t.name}`)
      return false
    }
    seen.add(t.name)
    return true
  })

  console.log(`Migrating ${unique.length} unique themes...`)

  for (const theme of unique) {
    const doc = {
      _id: `theme-${theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      _type: 'uiTheme',
      name: theme.name,
      description: theme.description,
      light: theme.light,
      dark: theme.dark,
      typography: theme.typography,
      spacing: theme.spacing,
      shadows: theme.shadows
    }

    try {
      await targetClient.createOrReplace(doc)
      console.log(`  Migrated: ${theme.name}`)
    } catch (err) {
      console.error(`  Failed: ${theme.name}`, err)
    }
  }

  console.log('Done!')
}

migrate()
