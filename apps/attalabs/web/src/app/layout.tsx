export const dynamic = 'force-dynamic'

import { buildFaviconIcons, getProductCms } from '@atta/cms'
import { IdentityProvider } from '@atta/identity/react'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { Footer } from '@atta/ui/footer'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import '@atta/ui/canvas.css'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getProductCms('attalabs')
  return {
    title: 'Atta — Where deep thinking happens',
    description: 'A place for deep thinking with AI. Bring any model. Deliberate across them. Keep what matters.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { config, branding } = await getProductCms('attalabs')

  return (
    <NextWebShell config={config} branding={branding} styleId='atta-theme' cookieName='atta-color-scheme'>
      <PreviewThemeListener />
      <IdentityProvider>{children}</IdentityProvider>
      <Footer product='attalabs' tagline='A lab building thinking tools.' links={[]} />
    </NextWebShell>
  )
}
