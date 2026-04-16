import type { ReactNode } from 'react'
import { TopBar } from '@/components/shared/TopBar'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <TopBar />
      </header>
      <main className='flex-1 min-h-0'>{children}</main>
    </>
  )
}
