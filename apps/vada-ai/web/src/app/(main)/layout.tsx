import type { ReactNode } from 'react'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex h-dvh flex-col'>
      <StickyHeaderTopBar isBlurred={true} className='z-40 shrink-0 border-b border-border/40'>
        <UserTopBar />
      </StickyHeaderTopBar>
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
    </div>
  )
}
