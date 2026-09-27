import { CONFIG_REFERENCE } from '@attalabs/vinaya-sources'
import type { ReactNode } from 'react'
import { FooterContentSlot } from '../../../_components/FooterGate'
import { DocsShell } from '../../_components/DocsShell'
import { ConfigSidebar } from './_components/ConfigSidebar'

/** `/docs/cli`'s layout with its own sidebar content: Config keeps its
 * `/docs/config` URL but passes a section list of its own into `DocsShell`
 * rather than the doctrine tree, which lists pages this page is not one of. */
export default function ConfigLayout({ children }: { children: ReactNode }) {
  return (
    <DocsShell sidebar={<ConfigSidebar fields={CONFIG_REFERENCE} />} sidebarLabel='Configuration' sidebarWidth='16rem'>
      <main className='flex-1 min-h-0 overflow-y-auto bg-background'>
        <div className='mx-auto max-w-4xl px-6 pt-10 pb-10 lg:px-12'>{children}</div>
        <FooterContentSlot />
      </main>
    </DocsShell>
  )
}
