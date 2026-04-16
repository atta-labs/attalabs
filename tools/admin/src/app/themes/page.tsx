import { getThemes, cmsClient } from '@atta/cms'
import { ThemesBrowseClient } from './_components/themes-browse-client'

export default async function ThemesPage() {
  const themes = await getThemes(cmsClient).catch(() => [])
  return <ThemesBrowseClient themes={themes} />
}
