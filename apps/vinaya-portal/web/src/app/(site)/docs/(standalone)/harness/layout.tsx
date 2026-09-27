import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocSidebar } from '../../_components/DocSidebar'
import { DocSidebarHost } from '../../_components/DocSidebarHost'
import { DocsShell } from '../../_components/DocsShell'

/** `/docs/harness` in the same shell as the doctrine pages, with the same doctrine
 * tree in its sidebar (and the same drawer below `lg`). No content pane or footer
 * of the doc pages' kind: the ring diagram fills the body under the nav strip on
 * `lg`+, and below `lg`, where the page stacks to its natural height, this box is
 * what scrolls. */
export default async function HarnessLayout({ children }: { children: ReactNode }) {
  const { nav } = await loadAegDocs()

  return (
    <DocsShell sidebar={<DocSidebar nav={nav} />}>
      <DocSidebarHost nav={nav} />
      <div className='min-h-0 flex-1 overflow-y-auto lg:overflow-hidden'>{children}</div>
    </DocsShell>
  )
}
