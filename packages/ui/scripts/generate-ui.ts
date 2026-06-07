import fs from 'node:fs'
import path from 'node:path'
import { cmsClient, getAttaConfig, getHeraldConfig, getVadaConfig, getVitakkaConfig } from '@atta/cms'

// When called from next.config.ts, process.cwd() is the app directory (apps/{app}/web/).
// packages/ui/generated/ is always three levels up from the app's web dir.
function getGeneratedDir(): string {
  return path.resolve(process.cwd(), '../../../packages/ui/generated')
}

type UILibrary = 'basic' | 'animate' | 'retro' | 'brutal'
type App = 'vada' | 'atta' | 'vitakka' | 'herald'

const CONFIG_FETCHERS: Record<
  App,
  () => Promise<{ userInterface?: { library?: { id?: string } | null } | null } | null>
> = {
  vada: () => getVadaConfig(cmsClient).catch(() => null),
  atta: () => getAttaConfig(cmsClient).catch(() => null),
  vitakka: () => getVitakkaConfig(cmsClient).catch(() => null),
  herald: () => getHeraldConfig(cmsClient).catch(() => null)
}

export async function generateUIIndex(app: App): Promise<UILibrary> {
  const config = await CONFIG_FETCHERS[app]()
  const library = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

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

  return library
}
