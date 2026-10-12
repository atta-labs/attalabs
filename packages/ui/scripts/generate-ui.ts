import fs from 'node:fs'
import path from 'node:path'
import { getProductConfig, PROJECT_IDS } from '@atta/cms'

const _cache = new Map<string, UILibrary>()

// When called from next.config.ts or an app's `generate` script, process.cwd() is the
// app's own directory. Apps nest at different depths under the monorepo root
// (apps/{app}/web/ for most, deeper for some), so a fixed
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

type UILibrary = 'basic' | 'animate' | 'retro'
type App = 'vada' | 'herald' | 'attalabs' | 'vinayaPortal' | 'vinayaStudio'

const LIBRARIES: readonly UILibrary[] = ['basic', 'animate', 'retro']

/**
 * The app's component library comes from ONE place: its Sanity config's
 * `userInterface.library` — the same field `NextWebShell` reads at runtime, so the
 * build-time components and the runtime chrome can never disagree.
 *
 * There is deliberately no fallback. The old CMS read fell back to `basic` whenever
 * the fetch failed, so the same commit could build on two different libraries
 * (#1027). A build that cannot read a valid library now stops with an error instead:
 * the generated output depends only on the commit and the CMS value.
 */
async function readLibraryFromCms(app: App): Promise<UILibrary> {
  let config: Awaited<ReturnType<typeof getProductConfig>>
  try {
    config = await getProductConfig(app)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`generate-ui: could not read ${app}'s config from Sanity (${reason}). Refusing to guess a library.`)
  }
  const id = config?.userInterface?.library?.id
  if (!id || !LIBRARIES.includes(id as UILibrary)) {
    throw new Error(
      `generate-ui: ${app}'s Sanity config has no valid userInterface.library (got ${JSON.stringify(id ?? null)}). ` +
        `Either the field is empty, or it references a library id that doesn't exist in the attalabs ` +
        'library registry (library-basic, library-animate, library-retro) — a typo resolves to null. ' +
        `Fix it in the ${app} Studio.`
    )
  }
  return id as UILibrary
}

export async function generateUIIndex(app: App): Promise<UILibrary> {
  const cached = _cache.get(app)
  if (cached) return cached

  const appLabel = app.padEnd(24)
  console.log('\n┌──────────────────────────────────────────────┐')
  console.log(`│  UI GENERATION — ${appLabel}│`)
  console.log('└──────────────────────────────────────────────┘')

  // UI_LIBRARY_OVERRIDE lets a check (e.g. typechecking an app under every library) build
  // against a library other than the CMS one, without touching the CMS.
  const override = process.env.UI_LIBRARY_OVERRIDE
  if (override && !LIBRARIES.includes(override as UILibrary)) {
    throw new Error(`generate-ui: UI_LIBRARY_OVERRIDE must be one of ${LIBRARIES.join(', ')} (got "${override}")`)
  }
  const library = override ? (override as UILibrary) : await readLibraryFromCms(app)

  console.log(
    override
      ? `\n⚠ UI_LIBRARY_OVERRIDE → ${library} (CMS not read)`
      : `\n📡 CMS: project ${PROJECT_IDS[app]} → ${library}`
  )

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
