import { notFound } from 'next/navigation'
import { getCmsClientsForProject } from '@/lib/cms-for-project'
import { isValidProject } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'
import { ThemeEditorClient } from './_components/theme-editor-client'

export const dynamic = 'force-dynamic'

interface FetchedTheme {
  _id: string
  name: string
  description?: string
  light?: Record<string, string>
  dark?: Record<string, string>
  typography?: { fontSans?: string; fontSerif?: string; fontMono?: string; trackingNormal?: string }
  spacing?: { radius?: string; spacing?: string }
  shadows?: Record<string, string>
}

export default async function ThemeEditPage({ params }: { params: Promise<{ project: string; themeId: string }> }) {
  const { project, themeId } = await params

  if (!isValidProject(project)) notFound()

  const validProject = project as ProjectKey
  const { readClient } = getCmsClientsForProject(validProject)

  const theme = await readClient
    .fetch<FetchedTheme>(
      `*[_type == "uiTheme" && _id == $themeId][0] {
        _id, name, description, light, dark, typography, spacing, shadows
      }`,
      { themeId }
    )
    .catch(() => null)

  if (!theme) notFound()

  return <ThemeEditorClient project={validProject} theme={theme} />
}
