'use client'

import { Button } from '@atta/ui'
import type { ReactNode } from 'react'

interface ScrollButtonProps {
  targetId: string
  children: ReactNode
}

/** Smooth-scrolls to the next full-screen section by id — every section-to-section CTA
 * (hero's "Show me more", "Execution Governance") shares this one implementation.
 * `size='lg'` is a real Button prop (the library's own size scale), not a className
 * override — every call site renders the exact same, unmodified library Button. */
export function ScrollButton({ targetId, children }: ScrollButtonProps) {
  return (
    <Button
      type='button'
      size='lg'
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
    >
      {children}
    </Button>
  )
}
