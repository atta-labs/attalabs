import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo, Text } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { ReactNode } from 'react'
import { ProductSwitch } from '@/app/_components/ProductSwitch'

const links = [
  { label: 'Home', href: '/', exact: true },
  { label: 'Known Limits', href: '/known-limits' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Studio', href: '/the-studio' }
]

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { branding } = await getProductCms('vinaya')
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <TopBar
        logo={
          <div className='flex items-center gap-4'>
            <NextLink href='/' variant='unstyled' className='flex items-center gap-2'>
              <Logo dark={logoUrl ?? undefined} alt='Vinaya' size='h-6' />
              <Text as='span' className='font-serif text-lg tracking-tight'>
                Vinaya
              </Text>
            </NextLink>
            <ProductSwitch current='portal' />
          </div>
        }
        links={links}
        withAuth={false}
      />
      {children}
    </>
  )
}
