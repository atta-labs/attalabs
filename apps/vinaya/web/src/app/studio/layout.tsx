import { Flex } from '@atta/ui/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { STUDIO_NAV } from './_lib/nav-groups'
import { StudioShell } from './_components/StudioShell'
import { StudioSidebar } from './_components/StudioSidebar'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <StudioShell>
      <Flex className='h-full w-full overflow-hidden'>
        <StudioSidebar groups={STUDIO_NAV} />
        <main className='flex-1 overflow-y-auto bg-background'>{children}</main>
      </Flex>
    </StudioShell>
  )
}
