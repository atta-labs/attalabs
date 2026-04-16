import type { ColorScheme } from '@atta/cms'
import { cmsClient, generateThemeCSSForScheme, getAttaConfig, getGoogleFontsUrl } from '@atta/cms'
import { Button, Text } from '@atta/ui'
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
        <LibraryProvider library={libraryId}>
          <div className='relative z-10 flex min-h-screen flex-col'>
            <header>
              <nav className='sticky top-0 w-full border-b border-border/20 bg-background/60 backdrop-blur-md z-50'>
                <div className='container mx-auto px-6 h-16 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-3 h-3 rounded-full bg-primary animate-pulse' />
                    <Text as='span' className='font-serif text-xl tracking-tight text-foreground'>
                      attā
                    </Text>
                  </div>
                  <div className='hidden md:flex items-center gap-8 text-sm uppercase tracking-widest text-muted-foreground'>
                    <span className='hover:text-primary transition-colors cursor-pointer'>Ecosystem</span>
                    <span className='hover:text-primary transition-colors cursor-pointer'>Vitakka</span>
                    <span className='hover:text-primary transition-colors cursor-pointer'>Vāda</span>
                  </div>
                  <div>
                    <Button variant='outline' className='border-border/50 text-foreground'>
                      Enter System
                    </Button>
                  </div>
                </div>
              </nav>
            </header>
            <main className='flex-1'>{children}</main>
            <footer className='border-t border-border/20 bg-background/80 backdrop-blur-md py-12'>
              <div className='container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6'>
                <div className='flex items-center gap-3 text-muted-foreground'>
                  <div className='w-3 h-3 rounded-full bg-primary' />
                  <span className='font-serif text-xl tracking-tight'>attā</span>
                </div>
                <Text as='p' className='text-sm text-muted-foreground text-center md:text-left'>
                  An Attā product · The only AI built to put every intelligence to work — together.
                </Text>
              </div>
            </footer>
          </div>
        </LibraryProvider>
      </body>
    </html>
  )
}
