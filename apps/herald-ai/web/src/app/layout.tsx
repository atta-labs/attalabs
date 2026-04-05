import type { ColorScheme } from '@atta/cms'
import { cmsClient, generateThemeCSSForScheme, getHeraldConfig } from '@atta/cms'
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Geist, Playfair_Display } from 'next/font/google'

import { LibraryProvider } from '@/components/providers/LibraryProvider'
import type { UILibrary } from '@/hooks/useLibraryLoader'
import { DEFAULT_THEME_CSS } from '@/lib/default-theme'
import { getGoogleFontsUrl } from '@/lib/font-loader'
import { cn } from '@/lib/utils'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap'
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Herald — Forensic Match Audit',
  description: 'Evidence-based match reports for recruiters and hiring managers.'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch Herald platform UI config from CMS
  const config = await getHeraldConfig(cmsClient).catch(() => null)
  const theme = config?.userInterface?.theme ?? null
  const colorScheme: ColorScheme = config?.userInterface?.colorScheme ?? 'dark'
  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  // Generate theme CSS from CMS config, fall back to default
  let themeCSS = DEFAULT_THEME_CSS
  let fontsUrl: string | null = null
  if (theme) {
    themeCSS = generateThemeCSSForScheme(theme, colorScheme)
    if (theme.typography) {
      fontsUrl = getGoogleFontsUrl(theme.typography)
    }
  }

  return (
    <html lang='en' className={cn(playfair.variable, dmMono.variable, dmSans.variable, 'font-sans', geist.variable)}>
      <head>
        {fontsUrl && (
          <>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
            <link rel='stylesheet' href={fontsUrl} />
          </>
        )}
        <style id='herald-theme' dangerouslySetInnerHTML={{ __html: themeCSS }} />
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        <ClerkProvider>
          <LibraryProvider library={libraryId}>{children}</LibraryProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
