import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { loadAegDocs } from '@/lib/docs/load-aeg-docs'
import { DocSidebarHost } from './_components/DocSidebarHost'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { nav } = await loadAegDocs()

  return (
    // Under `studio/`, this height came for free from StudioShell's own
    // h-[calc(100dvh-3.5rem)] wrapper. The `(site)` group has no such
    // ancestor — its TopBar sits directly above `{children}` — so this
    // layout now supplies the same 56px-TopBar-height calc itself, matching
    // how-it-works/page.tsx's identical wrapper.
    <Flex className='h-[calc(100dvh-56px)] w-full overflow-hidden'>
      <DocSidebarHost nav={nav} />
      <main className='flex-1 overflow-y-auto px-12 pb-10 bg-background'>
        <div className='mx-auto max-w-4xl'>{children}</div>
      </main>
    </Flex>
  )
}
