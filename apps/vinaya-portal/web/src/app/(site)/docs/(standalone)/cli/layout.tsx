import { COMMANDS } from '@attalabs/vinaya-sources'
import type { ReactNode } from 'react'
import { FooterContentSlot } from '../../../_components/FooterGate'
import { DocsShell } from '../../_components/DocsShell'
import { CliSidebar } from './_components/CliSidebar'

/** The command list in `DocsShell`'s sidebar at a fixed 16rem, the content pane
 * scrolling on its own at every width. Needs no async data fetch of its own:
 * `COMMANDS` is a static registry import. */
export default function CliLayout({ children }: { children: ReactNode }) {
  return (
    <DocsShell sidebar={<CliSidebar commands={COMMANDS} />} sidebarLabel='Commands' sidebarWidth='16rem'>
      <main className='flex-1 min-h-0 overflow-y-auto bg-background'>
        <div className='mx-auto max-w-4xl px-6 pt-10 pb-10 lg:px-12'>{children}</div>
        <FooterContentSlot />
      </main>
    </DocsShell>
  )
}
