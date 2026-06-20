import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocSidebarHost } from './_components/DocSidebarHost'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { nav } = await loadAegDocs()

  return (
    <Flex className='h-full w-full overflow-hidden'>
      <DocSidebarHost nav={nav} />
      <main className='flex-1 overflow-y-auto px-12 py-10 bg-background'>
        <div className='mx-auto max-w-4xl'>{children}</div>
      </main>
    </Flex>
  )
}
