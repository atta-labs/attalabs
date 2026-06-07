'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'

export function ModeSwitch() {
  const pathname = usePathname()
  const isRecruiter = pathname.startsWith('/recruiter')
  const router = useRouter()

  const segmentClass = (active: boolean) =>
    cn(
      'h-6 rounded-sm px-2.5 font-mono text-[10px] uppercase tracking-[0.15em]',
      active && 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
    )

  return (
    <div className='flex items-center gap-px rounded border border-border/50 p-0.5'>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => router.push('/candidate')}
        className={segmentClass(!isRecruiter)}
      >
        Candidate
      </Button>
      <Button variant='ghost' size='sm' onClick={() => router.push('/recruiter')} className={segmentClass(isRecruiter)}>
        Recruiter
      </Button>
    </div>
  )
}
