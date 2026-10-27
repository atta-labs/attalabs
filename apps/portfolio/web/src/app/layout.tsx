export const dynamic = 'force-dynamic'

import { buildFaviconIcons, getProductCms } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getProductCms('portfolio')
  return {
    title: 'Daniel Estevez — AI Systems Engineer',
    description:
      'Fifteen years shipping production software, four building with AI agents every day. The story, the career, and the products of Atta Labs.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { config, branding } = await getProductCms('portfolio')

  // Public, read-only page — no Clerk session to provide.
  return (
    <NextWebShell
      config={config}
      branding={branding}
      styleId='portfolio-theme'
      cookieName='atta-color-scheme'
      withAuth={false}
    >
      <PreviewThemeListener />
      {children}
    </NextWebShell>
  )
}
