import type { ReactNode } from 'react'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'

export default function DeliberationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StickyHeaderTopBar isBlurred={true} className='z-40'>
        <UserTopBar />
      </StickyHeaderTopBar>
      {children}
    </>
  )
}
