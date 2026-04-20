import { cmsClient, getVadaConfig, getVadaBranding } from '@atta/cms'
import { IdentityProvider } from '@atta/identity/react'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import '@atta/ui/canvas.css'
import { MockModeBanner } from '@/components/MockModeBanner'
import { PreviewThemeListener } from '@/components/theme/preview-theme-listener'

export const metadata: Metadata = {
  title: 'Vada AI',
  description: 'Deliberation engine for structured thinking.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, branding] = await Promise.all([
    getVadaConfig(cmsClient).catch(() => null),
    getVadaBranding(cmsClient).catch(() => null)
  ])

  return (
    <NextWebShell config={config} branding={branding} styleId='vada-theme'>
      <PreviewThemeListener />
      <MockModeBanner />
      <IdentityProvider>{children}</IdentityProvider>
    </NextWebShell>
  )
}
