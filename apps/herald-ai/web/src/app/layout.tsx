export const dynamic = 'force-dynamic'

import { buildFaviconIcons, createProductClient, getHeraldBranding, getHeraldConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

const heraldClient = createProductClient('herald')

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getHeraldBranding(heraldClient).catch(() => null)
  return {
    title: 'Herald — Forensic Match Audit',
    description: 'Evidence-based match reports for recruiters and hiring managers.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getHeraldConfig(heraldClient).catch(() => null)
  return (
    <NextWebShell config={config} styleId='herald-theme' cookieName='herald-color-scheme'>
      {children}
    </NextWebShell>
  )
}
