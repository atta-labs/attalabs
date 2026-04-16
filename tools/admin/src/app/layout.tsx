import { cmsClient, generateThemeCSSForScheme, getGoogleFontsUrl, getVadaConfig } from '@atta/cms'
import { LibraryProvider } from '@atta/ui/lib/library-provider'
import type { UILibrary } from '@atta/ui/lib/library-loader'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin-shell'
import '@atta/ui/globals.css'

export const metadata: Metadata = {
  title: 'Atta Admin',
  description: 'Atta AI developer tools'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getVadaConfig(cmsClient).catch(() => null)
  const theme = config?.userInterface?.theme ?? null
  const colorScheme = config?.userInterface?.colorScheme ?? 'dark'
  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary
  const themeCSS = theme ? generateThemeCSSForScheme(theme, colorScheme) : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

  return (
    <html lang='en'>
      <head>
        {fontsUrl && (
          <>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
            <link rel='stylesheet' href={fontsUrl} />
          </>
        )}
        {themeCSS && <style id='vada-theme' dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        <LibraryProvider library={libraryId}>
          <AdminShell>{children}</AdminShell>
        </LibraryProvider>
      </body>
    </html>
  )
}
