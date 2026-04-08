import { cmsClient, getHeraldConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

export const metadata: Metadata = {
  title: 'Herald — Forensic Match Audit',
  description: 'Evidence-based match reports for recruiters and hiring managers.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getHeraldConfig(cmsClient).catch(() => null)
  return (
    <NextWebShell config={config} styleId='herald-theme'>
      {children}
    </NextWebShell>
  )
}
