import type { ReactNode } from 'react'
import { ScienceSidebar } from './components/ScienceSidebar'

export default function ScienceLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-dvh'>
      <ScienceSidebar />
      <main className='flex-1 px-8 py-16 max-w-3xl'>{children}</main>
    </div>
  )
}
