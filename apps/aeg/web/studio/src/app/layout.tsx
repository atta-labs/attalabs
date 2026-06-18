export const dynamic = 'force-dynamic'

import { cmsClient, generateThemeCSSForScheme, getAttaBranding, getAttaConfig, getGoogleFontsUrl } from '@atta/cms'
import type { CMSTheme } from '@atta/cms'
import { LibraryProvider } from '@atta/ui/lib/library-provider'
import type { UILibrary } from '@atta/ui/lib/library-loader'
import { resolveColorScheme } from '@atta/ui/lib/color-scheme'
import type { ColorScheme } from '@atta/ui/lib/color-scheme'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { AegLogo } from './components/AegLogo'
import { StudioShell } from './components/StudioShell'

const COOKIE_NAME = 'aeg-color-scheme'

export const metadata: Metadata = {
  title: 'AEG Studio',
  description: 'Local governance studio for AEG artifacts.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, branding] = await Promise.all([
    getAttaConfig(cmsClient).catch(() => null),
    getAttaBranding(cmsClient).catch(() => null)
  ])

  const theme = config?.userInterface?.theme ?? null
  const cmsScheme = config?.userInterface?.colorScheme as ColorScheme | undefined

  const cookieStore = await cookies()
  const cookieScheme = cookieStore.get(COOKIE_NAME)?.value
  const colorScheme: ColorScheme = resolveColorScheme(cookieScheme, cmsScheme)

  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  const themeCSS = theme ? generateThemeCSSForScheme(theme as CMSTheme, colorScheme) : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

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
        {branding?.faviconIco?.url && <link rel='icon' type='image/x-icon' href={branding.faviconIco.url} />}
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        {themeCSS && <style id='aeg-theme' dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        <LibraryProvider library={libraryId}>
          <nav className='w-full border-b border-border'>
            <div className='flex h-14 w-full items-center px-6'>
              <div className='flex items-center gap-2 text-foreground'>
                <AegLogo className='h-6 w-6' />
                <span className='font-serif text-lg tracking-tight'>AEG</span>
              </div>
            </div>
          </nav>
          <StudioShell>{children}</StudioShell>
        </LibraryProvider>
      </body>
    </html>
  )
}
