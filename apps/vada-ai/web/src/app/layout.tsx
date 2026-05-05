import { buildFaviconIcons, cmsClient, getVadaBranding, getVadaConfig } from '@atta/cms'
import { IdentityProvider } from '@atta/identity/react'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import '@atta/ui/canvas.css'
import '@/styles/globals.css'
import { MockModeBanner } from '@/components/MockModeBanner'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getVadaBranding(cmsClient).catch(() => null)
  return {
    title: 'Vada AI',
    description: 'Deliberation engine for structured thinking.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, branding] = await Promise.all([
    getVadaConfig(cmsClient).catch(() => null),
    getVadaBranding(cmsClient).catch(() => null)
  ])

  return (
    <NextWebShell config={config} branding={branding} styleId='vada-theme' cookieName='vada-color-scheme'>
      <PreviewThemeListener />
      <MockModeBanner />
      <IdentityProvider>{children}</IdentityProvider>
    </NextWebShell>
  )
}
