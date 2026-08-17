import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getAegNavIcon } from '@/lib/nav-icons'
import { StudioShell } from './_components/StudioShell'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

function IconFor({ slug }: { slug: string }) {
  const Icon = getAegNavIcon(slug)
  return <Icon className='size-4' aria-hidden />
}

// `/docs/reference` used to be same-origin (Studio and the doctrine browser
// shared one Next app). After the Portal/Studio split it lives in
// `apps/vinaya-portal/web` — a different app, a different origin locally —
// so this is now a cross-app `external` link to Portal's production domain
// rather than an in-app route.
const links = [
  { label: 'Home', href: '/studio', icon: <IconFor slug='overview' /> },
  { label: 'Projects', href: '/studio/projects', icon: <IconFor slug='projects' /> },
  { label: 'Tranches', href: '/studio/tranches', icon: <IconFor slug='tranches' /> },
  { label: 'Backlog', href: '/studio/backlog', icon: <IconFor slug='backlog' /> },
  { label: 'Docs', href: 'https://vinaya.attalabs.dev/docs/reference', icon: <IconFor slug='docs' />, external: true }
]

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const { branding } = await getProductCms('vinaya')
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <TopBar
        logo={
          <NextLink href='/studio' variant='unstyled' className='flex items-center gap-2'>
            <Logo dark={logoUrl ?? undefined} alt='Vinaya Studio' size='h-10' text={['Vinaya', 'Studio']} />
          </NextLink>
        }
        links={links}
        withAuth={false}
      />
      <StudioShell>{children}</StudioShell>
    </>
  )
}
