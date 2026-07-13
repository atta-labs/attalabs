'use client'

import { Button } from '@atta/ui'
import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

interface ScrollButtonProps {
  targetId: string
  children: ReactNode
  className?: string
}

/** Smooth-scrolls to the next full-screen section by id — every section-to-section CTA
 * (hero's "Show me more", "Execution Governance") shares this one implementation. */
export function ScrollButton({ targetId, children, className }: ScrollButtonProps) {
  return (
    <Button
      type='button'
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
      className={cn('font-mono', className)}
    >
      {children}
    </Button>
  )
}
