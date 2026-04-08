import type { ColorScheme } from '@atta/cms'
import { cmsClient, generateThemeCSSForScheme, getAttaConfig, getGoogleFontsUrl } from '@atta/cms'
import type { UILibrary } from '@atta/ui/lib/library-loader'
import { LibraryProvider } from '@atta/ui/lib/library-provider'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

export const metadata: Metadata = {
  title: 'Attā',
  description: 'Self.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getAttaConfig(cmsClient).catch(() => null)
  const theme = config?.userInterface?.theme ?? null
  const colorScheme: ColorScheme = config?.userInterface?.colorScheme ?? 'dark'
  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  const themeCSS = theme ? generateThemeCSSForScheme(theme, colorScheme) : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

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
        {themeCSS && <style id='atta-theme' dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        <LibraryProvider library={libraryId}>{children}</LibraryProvider>
      </body>
    </html>
  )
}
