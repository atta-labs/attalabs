export const dynamic = 'force-dynamic'

import { buildFaviconIcons, getProductCms } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import './herald.css'

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getProductCms('herald')
  return {
    title: 'Herald — Forensic Match Audit',
    description: 'Evidence-based match reports for recruiters and hiring managers.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { config } = await getProductCms('herald')
  return (
    <NextWebShell config={config} styleId='herald-theme' cookieName='herald-color-scheme'>
      <PreviewThemeListener />
      {children}
    </NextWebShell>
  )
}
