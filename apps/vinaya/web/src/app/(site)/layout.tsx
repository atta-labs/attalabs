import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { ReactNode } from 'react'
import { ProductSwitch } from '@/app/_components/ProductSwitch'

const links = [
  { label: 'Home', href: '/', exact: true },
  { label: 'Known Limits', href: '/known-limits' },
  { label: 'The Harness', href: '/the-harness' },
  { label: 'Studio', href: '/the-studio' },
  { label: 'Install', href: '/install' },
  { label: 'Docs', href: '/docs' }
]

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { branding } = await getProductCms('vinaya')
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <TopBar
        logo={
          <NextLink href='/' variant='unstyled' className='flex items-center gap-2'>
            <Logo dark={logoUrl ?? undefined} alt='Vinaya' size='h-10' text={['Execution', 'Harnessing']} />
          </NextLink>
        }
        links={links}
        extraActions={<ProductSwitch current='portal' />}
        withAuth={false}
      />
      {children}
    </>
  )
}
