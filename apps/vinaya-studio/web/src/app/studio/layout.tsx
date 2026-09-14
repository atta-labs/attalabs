import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { forgeProjectSegment } from '@/app/studio/_lib/tranche-href'
import { listProjectViews } from '@/lib/repo-state'
import { withDefaultBoardEntry } from '@/lib/repo-state/default-board-slug'
import { StudioShell } from './_components/StudioShell'
import type { StudioProjectLink } from './_components/StudioSidebar'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

async function resolveProjectLinks(): Promise<StudioProjectLink[]> {
  const listing = await listProjectViews()
  if (listing.registryPresent) {
    return listing.projects.map((p) => ({ segment: p.name, href: `/studio/projects/${p.name}`, label: p.name }))
  }
  return withDefaultBoardEntry(listing.projects).map((p) => {
    const segment = forgeProjectSegment(p.name)
    return { segment, href: `/studio/projects/${segment}`, label: 'label' in p ? p.label : p.name }
  })
}

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const [{ branding }, projectLinks] = await Promise.all([getProductCms('vinayaStudio'), resolveProjectLinks()])
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <TopBar
        logo={
          <NextLink href='/studio' variant='unstyled' className='flex items-center gap-2'>
            <Logo dark={logoUrl ?? undefined} alt='Vinaya Studio' size='h-10' text={['Vinaya', 'Studio']} />
          </NextLink>
        }
        withAuth={false}
      />
      <StudioShell projectLinks={projectLinks}>{children}</StudioShell>
    </>
  )
}
