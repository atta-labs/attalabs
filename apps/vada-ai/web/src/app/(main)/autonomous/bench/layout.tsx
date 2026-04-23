import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import Link from 'next/link'

export default function BenchLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <div className='min-h-dvh bg-background'>
      <header className='border-b border-border bg-muted/20 px-6 py-3'>
        <nav className='flex items-center gap-6 text-sm'>
          <span className='font-mono font-semibold text-foreground'>/autonomous/bench</span>
          <Link href='/autonomous/bench' className='text-muted-foreground hover:text-foreground transition-colors'>
            Overview
          </Link>
          <Link href='/autonomous/bench/v1' className='text-muted-foreground hover:text-foreground transition-colors'>
            V1
          </Link>
          <Link
            href='/autonomous/bench/v2/task-2'
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            Task 2
          </Link>
          <Link
            href='/autonomous/bench/v2/task-3'
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            Task 3
          </Link>
          <Link
            href='/autonomous/bench/v2/task-3-5'
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            Task 3.5
          </Link>
        </nav>
      </header>
      <main className='px-6 py-6'>{children}</main>
    </div>
  )
}
