import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@atta/ui/shared'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { fetchVadaBranding } from '@/lib/branding'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const branding = await fetchVadaBranding()
  const logo =
    branding?.logoSolidLight?.url || branding?.logoSolidDark?.url ? (
      <Link href='/'>
        <Logo
          light={branding.logoSolidLight?.url}
          dark={branding.logoSolidDark?.url}
          alt={branding.productName ?? 'Vada AI'}
          size='h-9'
        />
      </Link>
    ) : null

  return (
    <div className='flex h-dvh flex-col'>
      <StickyHeaderTopBar isBlurred={true} className='z-40 shrink-0 border-b border-border/40'>
        <UserTopBar logo={logo} />
      </StickyHeaderTopBar>
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
    </div>
  )
}
