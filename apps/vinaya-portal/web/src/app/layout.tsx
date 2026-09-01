import { buildFaviconIcons } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'
import { getPortalCms } from '@/lib/portal-cms'

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getPortalCms()
  return {
    title: 'Vinaya — A harness for your software engineering process',
    description:
      'Agents obey checkers, not documents. Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { config, branding } = await getPortalCms()

  return (
    <NextWebShell
      config={config}
      branding={branding}
      styleId='vinaya-theme'
      cookieName='vinaya-color-scheme'
      withAuth={false}
      staticColorScheme
    >
      <PreviewThemeListener />
      {children}
      <Analytics />
    </NextWebShell>
  )
}
