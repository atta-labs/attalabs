import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocSidebarHost } from './_components/DocSidebarHost'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { nav, basePath } = await loadAegDocs()

  return (
    <div className='flex gap-8'>
      <DocSidebarHost nav={nav} basePath={basePath} />
      <div className='flex-1 min-w-0'>{children}</div>
    </div>
  )
}
