import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo, Text } from '@atta/ui/shared'
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
  { label: 'Docs', href: '/studio/docs' }
]

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const { branding } = await getProductCms('vinaya')
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <TopBar
        logo={
          <div className='flex items-center gap-4'>
            <NextLink href='/studio' variant='unstyled' className='flex items-center gap-2'>
              <Logo dark={logoUrl ?? undefined} alt='Vinaya' size='h-6' />
              <Text as='span' className='font-serif text-lg tracking-tight'>
                Vinaya Studio
              </Text>
            </NextLink>
            <ProductSwitch current='studio' />
          </div>
        }
        links={links}
        withAuth={false}
      />
      <StudioShell>{children}</StudioShell>
    </>
  )
}
