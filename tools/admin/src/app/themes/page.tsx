import { cmsClient, getThemes, getVadaConfig } from '@atta/cms'
import { ThemesBrowseClient } from './_components/themes-browse-client'

export default async function ThemesPage() {
  const [themes, config] = await Promise.all([
    getThemes(cmsClient).catch(() => []),
    getVadaConfig(cmsClient).catch(() => null)
  ])

  return (
    <ThemesBrowseClient
      themes={themes}
      currentThemeId={config?.userInterface?.theme?._id ?? null}
      currentColorScheme={config?.userInterface?.colorScheme ?? 'dark'}
    />
  )
}
