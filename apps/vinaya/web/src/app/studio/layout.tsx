import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ProductSwitch } from '@/app/_components/ProductSwitch'
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

// `/docs/reference` directly, not `/docs` — the redirect target itself,
// skipping the permanent-redirect hop task 4 put on the bare `/docs` URL.
const links = [
  { label: 'Home', href: '/studio', icon: <IconFor slug='overview' /> },
  { label: 'Projects', href: '/studio/projects', icon: <IconFor slug='projects' /> },
  { label: 'Tranches', href: '/studio/tranches', icon: <IconFor slug='tranches' /> },
  { label: 'Backlog', href: '/studio/backlog', icon: <IconFor slug='backlog' /> },
  { label: 'Docs', href: '/docs/reference', icon: <IconFor slug='docs' /> }
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
        extraActions={<ProductSwitch current='studio' />}
        withAuth={false}
      />
      <StudioShell>{children}</StudioShell>
    </>
  )
}
