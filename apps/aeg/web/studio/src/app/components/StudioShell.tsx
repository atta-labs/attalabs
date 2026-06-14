import { TopBar } from '@atta/ui/topbar'
import type { ReactNode } from 'react'
import { StudioSidebar } from './StudioSidebar'

export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar
        logo={<span className='font-serif text-lg tracking-tight text-foreground'>AEG</span>}
        isSignedIn={false}
      />
      <div className='flex h-[calc(100dvh-3.5rem)] overflow-hidden'>
        <aside className='h-full shrink-0 overflow-hidden'>
          <StudioSidebar />
        </aside>
        <div className='flex-1 min-w-0 overflow-y-auto'>
          <div className='mx-auto max-w-5xl px-8 py-8'>{children}</div>
        </div>
      </div>
    </>
  )
}
