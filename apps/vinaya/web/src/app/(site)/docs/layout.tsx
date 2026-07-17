import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocSidebarHost } from './_components/DocSidebarHost'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { nav } = await loadAegDocs()

  return (
    // Fills the (site) app-shell's scroll region exactly. `h-full` resolves
    // against `(site)/layout.tsx`'s `flex-1` content area (a definite height =
    // viewport − TopBar), so this no longer hardcodes the TopBar's pixel height
    // — and no longer nests a second `calc(100dvh-56px)` box inside the shell's
    // own `overflow-y-auto` region. `min-h-0` lets it shrink instead of forcing
    // that outer region to scroll.
    <Flex className='h-full min-h-0 w-full overflow-hidden'>
      <DocSidebarHost nav={nav} />
      <main className='flex-1 overflow-y-auto px-12 pb-10 bg-background'>
        <div className='mx-auto max-w-4xl'>{children}</div>
      </main>
    </Flex>
  )
}
