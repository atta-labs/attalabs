import { buildFaviconIcons, cmsClient, getHeraldBranding, getHeraldConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getHeraldBranding(cmsClient).catch(() => null)
  return {
    title: 'Herald — Forensic Match Audit',
    description: 'Evidence-based match reports for recruiters and hiring managers.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getHeraldConfig(cmsClient).catch(() => null)
  return (
    <NextWebShell config={config} styleId='herald-theme'>
      {children}
    </NextWebShell>
  )
}
