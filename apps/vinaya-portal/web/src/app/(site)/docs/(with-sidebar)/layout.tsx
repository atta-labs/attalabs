import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { FooterContentSlot } from '../../_components/FooterGate'
import { DocSidebarHost } from '../_components/DocSidebarHost'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { nav } = await loadAegDocs()

  return (
    // Fills the (site) app-shell's scroll region exactly. `h-full` resolves
    // against `(site)/layout.tsx`'s `flex-1` content area (a definite height =
    // viewport − TopBar), so this no longer hardcodes the TopBar's pixel height
    // — and no longer nests a second `calc(100dvh-56px)` box inside the shell's
    // own `overflow-y-auto` region. `min-h-0` lets it shrink instead of forcing
    // that outer region to scroll.
    // Below `lg` this stacks: `DocSidebarHost`'s drawer bar on top, content
    // below. At `lg`+ it is the same two-column row it has always been (the
    // bar is `lg:hidden`, the rail `hidden lg:flex`).
    <Flex className='h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row'>
      <DocSidebarHost nav={nav} />
      <main className='flex-1 min-h-0 overflow-y-auto bg-background'>
        <div className='mx-auto max-w-4xl px-6 pt-10 pb-10 lg:px-12'>{children}</div>
        <FooterContentSlot />
      </main>
    </Flex>
  )
}
