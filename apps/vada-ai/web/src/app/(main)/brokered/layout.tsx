import type { ReactNode } from 'react'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { BrokeredTopBar } from '@/components/BrokeredTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { fetchVadaBranding } from '@/lib/branding'

export default async function BrokeredLayout({ children }: { children: ReactNode }) {
  const branding = await fetchVadaBranding()
  const lightUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url
  const darkUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidDark?.url
  const logo =
    lightUrl || darkUrl ? (
      <NextLink variant='unstyled' href='/'>
        <Logo light={lightUrl} dark={darkUrl} alt={branding?.productName ?? 'Vada AI'} size='h-10' />
      </NextLink>
    ) : null

  return (
    <>
      <StickyHeaderTopBar isBlurred={true} className='z-40 border-b border-border/40'>
        <BrokeredTopBar logo={logo} />
      </StickyHeaderTopBar>
      <main>{children}</main>
    </>
  )
}
