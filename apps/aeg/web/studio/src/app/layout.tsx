export const dynamic = 'force-dynamic'

import { cmsClient, getAttaBranding, getAttaConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { TopBar } from '@atta/ui/topbar'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { AegLogo } from './components/AegLogo'
import { StudioShell } from './components/StudioShell'

export const metadata: Metadata = {
  title: 'AEG Studio',
  description: 'Local governance studio for AEG artifacts.'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, branding] = await Promise.all([
    getAttaConfig(cmsClient).catch(() => null),
    getAttaBranding(cmsClient).catch(() => null)
  ])

  const links = [
    { label: 'Projects', href: '/projects' },
    { label: 'Iterations', href: '/iterations' },
    { label: 'Dependency graph', href: '/graph' },
    { label: 'Docs', href: '/docs' }
  ]

  return (
    <NextWebShell
      config={config}
      branding={branding}
      styleId='aeg-theme'
      cookieName='aeg-color-scheme'
      withAuth={false}
    >
      <TopBar
        logo={
          <div className='flex items-center gap-2 text-foreground'>
            <AegLogo className='h-6 w-6' />
            <span className='font-serif text-lg tracking-tight'>AEG</span>
          </div>
        }
        links={links}
        withAuth={false}
      />
      <StudioShell>{children}</StudioShell>
    </NextWebShell>
  )
}
