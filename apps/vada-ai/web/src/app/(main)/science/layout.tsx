import type { ReactNode } from 'react'
import { ScienceSidebar } from './components/ScienceSidebar'

export default function ScienceLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex h-full'>
      <ScienceSidebar />
      <div className='flex-1 overflow-y-auto'>
        <div className='mx-auto max-w-3xl px-8 py-4'>{children}</div>
      </div>
    </div>
  )
}
