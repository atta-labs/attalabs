import type { ReactNode } from 'react'
import { Footer } from '@atta/ui/footer'
import { HeraldTopBar } from '@/components/HeraldTopBar'

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <HeraldTopBar />
      </header>
      <main className='flex-1 min-h-0'>{children}</main>
      <Footer product='herald' tagline='Forensic hiring audits' links={[]} />
    </>
  )
}
