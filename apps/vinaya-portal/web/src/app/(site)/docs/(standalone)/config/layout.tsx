import { CONFIG_REFERENCE } from '@attalabs/vinaya-sources'
import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { FooterContentSlot } from '../../../_components/FooterGate'
import { ConfigSidebar } from './_components/ConfigSidebar'

/** `/docs/cli`'s shell exactly (rail at `lg`+, content pane scrolling
 * independently at every width) — Config keeps its `/docs/config` URL but owns
 * a section rail of its own rather than inheriting `DocSidebarHost`'s doctrine
 * tree, which lists pages this page is not one of. Duplicated rather than
 * shared with `/docs/cli` for the same reason that one is: the two rails carry
 * different registries and neither shell fetches. */
export default function ConfigLayout({ children }: { children: ReactNode }) {
  return (
    <Flex className='h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row'>
      <ConfigSidebar fields={CONFIG_REFERENCE} />
      <main className='flex-1 min-h-0 overflow-y-auto bg-background'>
        <div className='mx-auto max-w-4xl px-6 pt-10 pb-10 lg:px-12'>{children}</div>
        <FooterContentSlot />
      </main>
    </Flex>
  )
}
