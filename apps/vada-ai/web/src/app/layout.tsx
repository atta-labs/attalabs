import { cmsClient, getVadaConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'

export const metadata: Metadata = {
  title: 'Vada AI',
  description: 'Deliberation engine for structured thinking.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getVadaConfig(cmsClient).catch(() => null)
  return (
    <NextWebShell config={config} styleId='vada-theme'>
      <StickyHeaderTopBar isBlurred={false} className='z-40'>
        <UserTopBar />
      </StickyHeaderTopBar>
      {children}
    </NextWebShell>
  )
}
