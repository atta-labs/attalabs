import {
  cmsClient,
  generateThemeCSSForScheme,
  getAttaBranding,
  getGoogleFontsUrl,
  getHeraldBranding,
  getVadaBranding,
  getVadaConfig,
  getVitakkaBranding
} from '@atta/cms'
import { ToastProvider } from '@atta/ui/components'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { getCmsClientsForProject } from '@/lib/cms-for-project'
import type { ProjectKey } from '@/lib/project-config'
import '@atta/ui/globals.css'

export const metadata: Metadata = {
  title: 'Atta Admin',
  description: 'Atta AI developer tools'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, vadaBranding, attaBranding, heraldBranding, vitakkaBranding] = await Promise.all([
    getVadaConfig(cmsClient).catch(() => null),
    getVadaBranding(getCmsClientsForProject('vada').readClient).catch(() => null),
    getAttaBranding(getCmsClientsForProject('atta').readClient).catch(() => null),
    getHeraldBranding(getCmsClientsForProject('herald').readClient).catch(() => null),
    getVitakkaBranding(getCmsClientsForProject('vitakka').readClient).catch(() => null)
  ])

  const projectLogos: Record<ProjectKey, string | null> = {
    vada: vadaBranding?.logoSolidDark?.url ?? null,
    atta: attaBranding?.logoSolidDark?.url ?? null,
    herald: heraldBranding?.logoSolidDark?.url ?? null,
    vitakka: vitakkaBranding?.logoSolidDark?.url ?? null
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
