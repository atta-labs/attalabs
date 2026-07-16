export const dynamic = 'force-dynamic'

import { buildFaviconIcons, getProductCms } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { Footer } from '@atta/ui/footer'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

// Vitakka is shelved and has no Sanity project of its own — its CMS identity
// moved to Vinaya (D-124). Borrows Atta's theme/branding, same precedent
// apps/vinaya/web used before this rename.
export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getProductCms('atta')
  return {
    title: 'Vitakka',
    description: 'Directed thought.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { config } = await getProductCms('atta')
  return (
    <NextWebShell config={config} styleId='vitakka-theme' cookieName='vitakka-color-scheme'>
      <main className='flex flex-col min-h-screen'>{children}</main>
      <Footer product='vitakka' tagline='Directed thought' links={[]} />
    </NextWebShell>
  )
}
