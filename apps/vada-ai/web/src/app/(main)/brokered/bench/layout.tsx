import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import Link from 'next/link'

export default function BrokeredBenchLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <div className='min-h-dvh bg-background'>
      <header className='border-b border-border bg-muted/20 px-6 py-3'>
        <nav className='flex items-center gap-6 text-sm'>
          <span className='font-mono font-semibold text-foreground'>/brokered/bench</span>
          <Link href='/brokered/bench' className='text-muted-foreground hover:text-foreground transition-colors'>
            Overview
          </Link>
          <Link
            href='/brokered/consultations'
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            Consultations →
          </Link>
        </nav>
      </header>
      <main className='px-6 py-6'>{children}</main>
    </div>
  )
}
