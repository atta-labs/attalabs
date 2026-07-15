import fs from 'node:fs'
import path from 'node:path'
import { cmsClient, cmsConfig, getAttaConfig, getHeraldConfig, getVadaConfig, getVinayaConfig } from '@atta/cms'

const _cache = new Map<string, UILibrary>()

// When called from next.config.ts or an app's `generate` script, process.cwd() is the
// app's own directory. Apps nest at different depths under the monorepo root
// (apps/{app}/web/ for most, apps/aeg/web/studio/ for AEG Studio), so a fixed
// "N levels up" offset is wrong for at least one caller. Walk up from cwd to the
// monorepo root (marked by turbo.json) instead, then descend into packages/ui/generated.
function findRepoRoot(startDir: string): string {
  let dir = startDir
  while (true) {
    if (fs.existsSync(path.join(dir, 'turbo.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(`generate-ui: could not locate monorepo root (no turbo.json) walking up from ${startDir}`)
    }
    dir = parent
  }
}

function getGeneratedDir(): string {
  return path.join(findRepoRoot(process.cwd()), 'packages/ui/generated')
}

type UILibrary = 'basic' | 'animate' | 'retro' | 'brutal'
type App = 'vada' | 'atta' | 'vinaya' | 'herald'

const CONFIG_FETCHERS: Record<
  App,
  () => Promise<{ userInterface?: { library?: { id?: string } | null } | null } | null>
> = {
  vada: () => getVadaConfig(cmsClient).catch(() => null),
  atta: () => getAttaConfig(cmsClient).catch(() => null),
  vinaya: () => getVinayaConfig(cmsClient).catch(() => null),
  herald: () => getHeraldConfig(cmsClient).catch(() => null)
}

export async function generateUIIndex(app: App): Promise<UILibrary> {
  const cached = _cache.get(app)
  if (cached) return cached

  const appLabel = app.padEnd(24)
  console.log('\n┌──────────────────────────────────────────────┐')
  console.log(`│  UI GENERATION — ${appLabel}│`)
  console.log('└──────────────────────────────────────────────┘')

  console.log('\n📡 CMS:')
  console.log(`   Project: ${cmsConfig.projectId}`)
  console.log(`   Dataset: ${cmsConfig.dataset}`)
  console.log(`   Token:   ${process.env.SANITY_API_TOKEN ? 'yes' : 'no'}`)

  const config = await CONFIG_FETCHERS[app]()
  const fromCms = config?.userInterface?.library?.id != null
  const library = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  console.log(`\n📦 Library: ${library}${fromCms ? '' : ' (fallback — CMS returned no config)'}`)

  const dir = path.join(getGeneratedDir(), app)
  fs.mkdirSync(dir, { recursive: true })

  fs.writeFileSync(
    path.join(dir, 'components.ts'),
    [
      '// AUTO-GENERATED — DO NOT EDIT',
      `// App: ${app} | Library: ${library}`,
      `export * from '../../libraries/${library}/components'`,
      ''
    ].join('\n')
  )

  fs.writeFileSync(
    path.join(dir, 'canvas.ts'),
    [
      '// AUTO-GENERATED — DO NOT EDIT',
      `// App: ${app} | Library: ${library}`,
      `export * from '../../canvas'`,
      ''
    ].join('\n')
  )

  console.log(`   ✓ packages/ui/generated/${app}/components.ts`)
  console.log(`   ✓ packages/ui/generated/${app}/canvas.ts\n`)

  _cache.set(app, library)
  return library
}
