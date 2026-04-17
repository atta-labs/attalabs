import type { ReactNode } from 'react'
import { ScienceSidebar } from './components/ScienceSidebar'

export default function ScienceLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex h-[calc(100dvh-3.5rem)] overflow-hidden'>
      <aside className='h-full shrink-0 overflow-hidden'>
        <ScienceSidebar />
      </aside>
      <div className='flex-1 min-w-0 overflow-y-auto'>
        <div className='mx-auto max-w-3xl px-8 py-8'>{children}</div>
      </div>
    </div>
  )
}
