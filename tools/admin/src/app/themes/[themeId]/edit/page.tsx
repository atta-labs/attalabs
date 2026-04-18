import { cmsClient } from '@atta/cms'
import { notFound } from 'next/navigation'
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

async function getEditableTheme(themeId: string): Promise<FetchedTheme | null> {
  return cmsClient.fetch(
    `*[_type == "uiTheme" && _id == $themeId][0] {
      _id,
      name,
      description,
      light,
      dark,
      typography,
      spacing,
      shadows
    }`,
    { themeId }
  )
}

export default async function ThemeEditPage({ params }: { params: Promise<{ themeId: string }> }) {
  const { themeId } = await params
  const theme = await getEditableTheme(themeId).catch(() => null)

  if (!theme) {
    notFound()
  }

  return <ThemeEditorClient theme={theme} />
}
