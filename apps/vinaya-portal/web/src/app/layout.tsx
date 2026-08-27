export const dynamic = 'force-dynamic'

import { buildFaviconIcons, getProductCms } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getProductCms('vinayaPortal')
  return {
    title: 'Vinaya — A harness for your software engineering process',
    description:
      'Agents obey checkers, not documents. Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { config, branding } = await getProductCms('vinayaPortal')

  return (
    <NextWebShell
      config={config}
      branding={branding}
      styleId='vinaya-theme'
      cookieName='vinaya-color-scheme'
      withAuth={false}
    >
      <PreviewThemeListener />
      {children}
      <Analytics />
    </NextWebShell>
  )
}
