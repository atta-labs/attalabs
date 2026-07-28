import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { StartSidebarHost } from './_components/StartSidebarHost'

/** `/docs`' `layout.tsx` shape exactly (rail at `lg`+, drawer below), over
 * this section's own fixed two-part nav — no forge/model dependency, so
 * unlike `/docs` this shell needs no async data fetch of its own. */
export default function StartLayout({ children }: { children: ReactNode }) {
  return (
    <Flex className='h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row'>
      <StartSidebarHost />
      <main className='flex-1 min-h-0 overflow-y-auto px-6 pb-10 bg-background lg:px-12'>
        <div className='mx-auto max-w-4xl'>{children}</div>
      </main>
    </Flex>
  )
}
