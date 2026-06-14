import { TopBar } from '@atta/ui/topbar'
import type { ReactNode } from 'react'
import { AegLogo } from './AegLogo'
import { StudioSidebar } from './StudioSidebar'

export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar
        logo={
          <div className='flex items-center gap-2 text-foreground'>
            <AegLogo className='h-6 w-6' />
            <span className='font-serif text-lg tracking-tight'>AEG</span>
          </div>
        }
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
