import { generateThemeCSSForScheme, getGoogleFontsUrl, getProductBranding, getProductConfig } from '@atta/cms'
import { ToastProvider } from '@atta/ui/components'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin-shell'
import type { ProjectKey } from '@/lib/project-config'
import '@atta/ui/globals.css'

export const metadata: Metadata = {
  title: 'Atta Admin',
  description: 'Atta AI developer tools'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The admin tool is internal and has no CMS identity of its own — it borrows
  // Vāda's theme. Each project logo is read from that project's own Sanity.
  //
  // These reads inherit `useCdn` from NODE_ENV, and admin is the theme-editing
  // tool — it must not read its own chrome from a stale CDN copy. Harmless
  // today (this package has no build/start script, so NODE_ENV is always
  // development and useCdn stays false); if admin ever gains a production
  // start, pass an explicit non-CDN client here.
  const [config, vadaBranding, attaBranding, heraldBranding, vinayaBranding] = await Promise.all([
    getProductConfig('vada').catch(() => null),
    getProductBranding('vada').catch(() => null),
    getProductBranding('atta').catch(() => null),
    getProductBranding('herald').catch(() => null),
    getProductBranding('vinaya').catch(() => null)
  ])

  const projectLogos: Record<ProjectKey, string | null> = {
    vada: vadaBranding?.logoSolidDark?.url ?? null,
    atta: attaBranding?.logoSolidDark?.url ?? null,
    herald: heraldBranding?.logoSolidDark?.url ?? null,
    vinaya: vinayaBranding?.logoSolidDark?.url ?? null
  }

  const theme = config?.userInterface?.theme ?? null
  const colorScheme = config?.userInterface?.colorScheme ?? 'dark'
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
        <ToastProvider defaultPosition='bottom-right'>
          <AdminShell logos={projectLogos}>{children}</AdminShell>
        </ToastProvider>
      </body>
    </html>
  )
}
