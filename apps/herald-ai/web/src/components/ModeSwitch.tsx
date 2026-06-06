'use client'

import { usePathname } from 'next/navigation'
import { NextLink } from '@atta/ui/lib/next-link'

export function ModeSwitch() {
  const pathname = usePathname()
  const isRecruiter = pathname.startsWith('/recruiter')

  return (
    <div className='border-b border-border/30 px-6 py-2'>
      <div className='mx-auto flex max-w-[680px] items-center gap-4'>
        <NextLink
          variant='nav'
          href='/candidate'
          active={!isRecruiter}
          className='font-mono text-[10px] uppercase tracking-[0.2em]'
        >
          Candidate
        </NextLink>
        <span className='font-mono text-[10px] text-border'>·</span>
        <NextLink
          variant='nav'
          href='/recruiter'
          active={isRecruiter}
          className='font-mono text-[10px] uppercase tracking-[0.2em]'
        >
          Recruiter
        </NextLink>
      </div>
    </div>
  )
}
