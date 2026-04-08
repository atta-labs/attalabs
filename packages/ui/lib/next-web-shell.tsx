import { buildClerkAppearance } from '@atta/auth'
import { AuthProvider } from '@atta/auth/provider'
import { generateThemeCSSForScheme, getGoogleFontsUrl, transformColorGroup } from '@atta/cms'
import type { PortalUiConfig } from '@atta/cms'
import type { ReactNode } from 'react'
import { LibraryProvider } from './library-provider'
import type { UILibrary } from './library-loader'

interface NextWebShellProps {
  children: ReactNode
  config: PortalUiConfig | null
  styleId: string
}

export async function NextWebShell({ children, config, styleId }: NextWebShellProps) {
  const theme = config?.userInterface?.theme ?? null
  const colorScheme = config?.userInterface?.colorScheme ?? 'dark'
  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  const themeCSS = theme ? generateThemeCSSForScheme(theme, colorScheme) : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

  let appearance: ReturnType<typeof buildClerkAppearance> | undefined
  if (theme) {
    const colorGroup = colorScheme === 'dark' ? theme.dark : theme.light
    const resolved = transformColorGroup(colorGroup)
    appearance = buildClerkAppearance({
      background: resolved.get('background')!,
      foreground: resolved.get('foreground')!,
      card: resolved.get('card')!,
      border: resolved.get('border')!,
      primary: resolved.get('primary')!,
      primaryForeground: resolved.get('primary-foreground')!,
      muted: resolved.get('muted')!,
      mutedForeground: resolved.get('muted-foreground')!,
      destructive: resolved.get('destructive')!
    })
  }

  return (
    <html lang='en'>
      <body className='min-h-screen bg-background text-foreground'>
        {fontsUrl && (
          <>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
            <link rel='stylesheet' href={fontsUrl} />
          </>
        )}
        {themeCSS && <style id={styleId} dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        <AuthProvider appearance={appearance}>
          <LibraryProvider library={libraryId}>{children}</LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
