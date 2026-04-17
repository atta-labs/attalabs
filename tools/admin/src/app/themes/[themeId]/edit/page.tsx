import { cmsClient } from '@atta/cms'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ThemeEditorClient } from './_components/theme-editor-client'

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

  return (
    <div className='flex h-full flex-col'>
      <div className='flex shrink-0 items-center gap-3 border-b border-border px-4 py-3'>
        <Link
          href='/themes'
          className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
        >
          ← Themes
        </Link>
        <span className='font-mono text-[10px] text-muted-foreground'>/</span>
        <span className='font-serif text-sm'>{theme.name}</span>
      </div>
      <div className='flex-1 min-h-0'>
        <ThemeEditorClient theme={theme} />
      </div>
    </div>
  )
}
