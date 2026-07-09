export const dynamic = 'force-dynamic'

import { buildFaviconIcons, createProductClient, getAttaBranding, getAttaConfig } from '@atta/cms'
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { TopBar } from '@atta/ui/topbar'
import { Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@atta/ui/globals.css'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Known Limits', href: '/known-limits' },
  { label: 'AEG', href: '/aeg' },
  { label: 'Studio', href: '/studio' },
  { label: 'Docs', href: '/studio/docs' }
]

// Vinaya has no Sanity project of its own yet — borrows Atta's theme/branding,
// same precedent as apps/aeg/web/studio. See apps/vinaya/specs/vinaya-spec.md.
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getAttaBranding(createProductClient('atta')).catch(() => null)
  return {
    title: 'Vinaya — Branch protection for the AI era',
    description:
      'Agents obey checkers, not documents. Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.',
    icons: buildFaviconIcons(branding)
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [config, branding] = await Promise.all([
    getAttaConfig(createProductClient('atta')).catch(() => null),
    getAttaBranding(createProductClient('atta')).catch(() => null)
  ])

  return (
    <NextWebShell
      config={config}
      branding={branding}
      styleId='vinaya-theme'
      cookieName='vinaya-color-scheme'
      withAuth={false}
    >
      <TopBar
        logo={
          <Text as='span' className='font-serif text-lg tracking-tight'>
            Vinaya
          </Text>
        }
        links={links}
        withAuth={false}
      />
      {children}
    </NextWebShell>
  )
}
