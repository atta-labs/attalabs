import { buildFaviconIcons, cmsClient, getAttaBranding, getAttaConfig } from '@atta/cms'
import { IdentityProvider } from '@atta/identity/react'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import '@atta/ui/canvas.css'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getAttaBranding(cmsClient).catch(() => null)
  return {
    title: 'Atta — Yours.',
    description: 'An ecosystem for careful thinking.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, branding] = await Promise.all([
    getAttaConfig(cmsClient).catch(() => null),
    getAttaBranding(cmsClient).catch(() => null)
  ])

  return (
    <NextWebShell config={config} branding={branding} styleId='atta-theme'>
      <IdentityProvider>{children}</IdentityProvider>
    </NextWebShell>
  )
}
