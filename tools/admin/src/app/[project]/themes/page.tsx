import { getThemes, getProductUiConfig } from '@atta/cms'
import { notFound } from 'next/navigation'
import { getCmsClientsForProject } from '@/lib/cms-for-project'
import { isValidProject, PROJECT_CONFIG } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'
import { ThemesBrowseClient } from './_components/themes-browse-client'

export const dynamic = 'force-dynamic'

export default async function ThemesPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params

  if (!isValidProject(project)) notFound()

  const validProject = project as ProjectKey
  const { readClient } = getCmsClientsForProject(validProject)
  const { readClient: attaReadClient } = getCmsClientsForProject('attalabs')
  const { configDocId } = PROJECT_CONFIG[validProject]

  const [themes, config] = await Promise.all([
    getThemes(attaReadClient).catch(() => []),
    getProductUiConfig(readClient, configDocId, configDocId).catch(() => null)
  ])

  return (
    <ThemesBrowseClient
      key={validProject}
      project={validProject}
      themes={themes}
      currentThemeId={config?.userInterface?.theme?._id ?? null}
      currentColorScheme={config?.userInterface?.colorScheme ?? 'dark'}
    />
  )
}
