import { COMMANDS } from '@attalabs/vinaya-sources'
import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { FooterContentSlot } from '../../../_components/FooterGate'
import { CliSidebar } from './_components/CliSidebar'

/** `/docs`' and `/start`'s `layout.tsx` shape exactly (rail at `lg`+, content
 * pane scrolling independently at every width) — duplicated rather than
 * shared (C1: `/docs` and `/start` are mid-edit on sibling tasks). Like
 * `/start` this shell needs no async data fetch of its own; `COMMANDS` is a
 * static registry import. */
export default function CliLayout({ children }: { children: ReactNode }) {
  return (
    <Flex className='h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row'>
      <CliSidebar commands={COMMANDS} />
      <main className='flex-1 min-h-0 overflow-y-auto bg-background'>
        <div className='mx-auto max-w-4xl px-6 pt-10 pb-10 lg:px-12'>{children}</div>
        <FooterContentSlot />
      </main>
    </Flex>
  )
}
