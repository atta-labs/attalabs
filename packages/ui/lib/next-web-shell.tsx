import { buildClerkAppearance } from '@atta/auth'
import { AuthProvider } from '@atta/auth/provider'
import { generateThemeCSS, getGoogleFontsUrl, transformColorGroup } from '@atta/cms'
import type { PortalUiConfig } from '@atta/cms'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { COLOR_SCHEME_COOKIE, resolveColorScheme, type ColorScheme } from './color-scheme'
import { LibraryProvider } from './library-provider'
import type { UILibrary } from './library-loader'
import { ToastProvider } from '../libraries/basic/components/display/toast'

interface NextWebShellProps {
  children: ReactNode
  config: PortalUiConfig | null
  styleId: string
}

export async function NextWebShell({ children, config, styleId }: NextWebShellProps) {
  const theme = config?.userInterface?.theme ?? null
  const cmsScheme = config?.userInterface?.colorScheme as ColorScheme | undefined

  const cookieStore = await cookies()
  const cookieScheme = cookieStore.get(COLOR_SCHEME_COOKIE)?.value
  const colorScheme: ColorScheme = resolveColorScheme(cookieScheme, cmsScheme)

  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  // Emit BOTH light and dark blocks; <html data-theme> picks which is active.
  const themeCSS = theme ? generateThemeCSS(theme) : null
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
    <html lang='en' data-theme={colorScheme}>
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
          <LibraryProvider library={libraryId}>
            <ToastProvider defaultPosition='bottom-right'>{children}</ToastProvider>
          </LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
