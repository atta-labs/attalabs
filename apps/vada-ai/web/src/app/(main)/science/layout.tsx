import type { ReactNode } from 'react'
import { ScienceSidebar } from './components/ScienceSidebar'

export default function ScienceLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex'>
      <div className='sticky top-14 h-[calc(100dvh-3.5rem)] shrink-0'>
        <ScienceSidebar />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='mx-auto max-w-3xl px-8 py-4'>{children}</div>
      </div>
    </div>
  )
}
