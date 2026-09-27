import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { FooterContentSlot } from '../../_components/FooterGate'
import { DocSidebar } from '../_components/DocSidebar'
import { DocsShell } from '../_components/DocsShell'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { nav } = await loadAegDocs()

  return (
    // The doctrine tree in `DocsShell`'s sidebar, sized to its own content (and
    // the shell's drawer below `lg`). The pane scrolls on its own (`min-h-0` lets
    // it shrink rather than grow the shell) and carries the site footer at its end.
    <DocsShell sidebar={<DocSidebar nav={nav} />} sidebarLabel='The Harness'>
      <main className='flex-1 min-h-0 overflow-y-auto bg-background'>
        <div className='mx-auto max-w-4xl px-6 pt-10 pb-10 lg:px-12'>{children}</div>
        <FooterContentSlot />
      </main>
    </DocsShell>
  )
}
