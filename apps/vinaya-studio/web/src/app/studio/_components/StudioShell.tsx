import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { StudioSidebarHost, type StudioProjectLink, type StudioRepoFooter } from './StudioSidebar'

/**
 * The one layout shell for every Studio page (task 11 #571 follow-up; sidebar
 * shell added task 2 #1054). It owns the persistent nav (a fixed rail at
 * `lg`+, a drawer below), the one scroll container, the page padding, and the
 * centered content column, so every route — projects, tranches, backlog, the
 * dashboard, the board — reads coherently instead of each page inventing (or
 * forgetting) its own spacing or nav. A page renders only its content
 * (`space-y-*`); it never sets `px`/`py`, width, or overflow of its own.
 */
export function StudioShell({
  projectLinks,
  footer,
  children
}: {
  projectLinks: StudioProjectLink[]
  footer: StudioRepoFooter
  children: ReactNode
}) {
  return (
    <Flex className='h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden lg:flex-row'>
      <StudioSidebarHost projectLinks={projectLinks} footer={footer} />
      <main className='min-h-0 flex-1 overflow-y-auto bg-background'>
        <div className='mx-auto w-full max-w-6xl px-8 py-8'>{children}</div>
      </main>
    </Flex>
  )
}
