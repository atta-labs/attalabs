export const dynamic = 'force-dynamic'

import { buildFaviconIcons, cmsClient, getVitakkaBranding, getVitakkaConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { Footer } from '@atta/ui/footer'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getVitakkaBranding(cmsClient).catch(() => null)
  return {
    title: 'Vitakka',
    description: 'Directed thought.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getVitakkaConfig(cmsClient).catch(() => null)
  return (
    <NextWebShell config={config} styleId='vitakka-theme' cookieName='vitakka-color-scheme'>
      <main className='flex flex-col min-h-screen'>{children}</main>
      <Footer product='vitakka' tagline='Directed thought' links={[]} showProductNav={true} />
    </NextWebShell>
  )
}
