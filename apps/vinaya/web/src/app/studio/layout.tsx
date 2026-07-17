import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ProductSwitch } from '@/app/_components/ProductSwitch'
import { StudioShell } from './_components/StudioShell'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

const links = [
  { label: 'Projects', href: '/studio/projects' },
  { label: 'Iterations', href: '/studio/iterations' },
  { label: 'Backlog', href: '/studio/backlog' },
  { label: 'Docs', href: '/docs' }
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
