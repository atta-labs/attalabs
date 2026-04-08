import { cmsClient, getVitakkaConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

export const metadata: Metadata = {
  title: 'Vitakka',
  description: 'Directed thought.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getVitakkaConfig(cmsClient).catch(() => null)
  return (
    <NextWebShell config={config} styleId='vitakka-theme'>
      {children}
    </NextWebShell>
  )
}
