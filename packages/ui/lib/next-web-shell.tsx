import { buildClerkAppearance } from '@atta/auth'
import { AuthProvider } from '@atta/auth/provider'
import { generateThemeCSS, getGoogleFontsUrl, transformColorGroup } from '@atta/cms'
import type { CMSBranding, PortalUiConfig } from '@atta/cms'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { COLOR_SCHEME_COOKIE, resolveColorScheme, type ColorScheme } from './color-scheme'
import { LibraryProvider } from './library-provider'
import type { UILibrary } from './library-loader'
import { ToastProvider } from '../libraries/basic/components/display/toast'

interface NextWebShellProps {
  children: ReactNode
  config: PortalUiConfig | null
  branding?: CMSBranding | null
  styleId: string
}

export async function NextWebShell({ children, config, branding, styleId }: NextWebShellProps) {
  const theme = config?.userInterface?.theme ?? null
  const cmsScheme = config?.userInterface?.colorScheme as ColorScheme | undefined

  const cookieStore = await cookies()
  const cookieScheme = cookieStore.get(COLOR_SCHEME_COOKIE)?.value
  const colorScheme: ColorScheme = resolveColorScheme(cookieScheme, cmsScheme)

  const faviconSet = colorScheme === 'dark' ? branding?.faviconDark : branding?.faviconLight

  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  // Emit BOTH light and dark blocks; <html data-theme> picks which is active.
  const themeCSS = theme ? generateThemeCSS(theme) : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

  let appearance: ReturnType<typeof buildClerkAppearance> | undefined
  if (theme) {
    const colorGroup = colorScheme === 'dark' ? theme.dark : theme.light
    const resolved = transformColorGroup(colorGroup)
    appearance = buildClerkAppearance(
      {
        background: resolved.get('background')!,
        foreground: resolved.get('foreground')!,
        card: resolved.get('card')!,
        border: resolved.get('border')!,
        primary: resolved.get('primary')!,
        primaryForeground: resolved.get('primary-foreground')!,
        muted: resolved.get('muted')!,
        mutedForeground: resolved.get('muted-foreground')!,
        destructive: resolved.get('destructive')!
      },
      colorScheme
    )
  }

  return (
    <html lang='en' data-theme={colorScheme}>
      <head>
        {fontsUrl && (
          <>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
            <link rel='stylesheet' href={fontsUrl} />
          </>
        )}
        {faviconSet && (
          <>
            {faviconSet.ico?.url && <link rel='icon' type='image/x-icon' href={faviconSet.ico.url} />}
            {faviconSet.png16?.url && <link rel='icon' type='image/png' sizes='16x16' href={faviconSet.png16.url} />}
            {faviconSet.png32?.url && <link rel='icon' type='image/png' sizes='32x32' href={faviconSet.png32.url} />}
            {faviconSet.png48?.url && <link rel='icon' type='image/png' sizes='48x48' href={faviconSet.png48.url} />}
            {faviconSet.png128?.url && (
              <link rel='icon' type='image/png' sizes='128x128' href={faviconSet.png128.url} />
            )}
            {faviconSet.png256?.url && (
              <link rel='icon' type='image/png' sizes='256x256' href={faviconSet.png256.url} />
            )}
            {faviconSet.png512?.url && (
              <link rel='icon' type='image/png' sizes='512x512' href={faviconSet.png512.url} />
            )}
          </>
        )}
        {branding?.appleTouchIcon?.url && <link rel='apple-touch-icon' href={branding.appleTouchIcon.url} />}
      </head>
      <body className='min-h-screen bg-background text-foreground'>
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
