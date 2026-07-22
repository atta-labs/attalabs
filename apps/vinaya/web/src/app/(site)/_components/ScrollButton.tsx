'use client'

import { Button } from '@atta/ui/components'
import type { ReactNode } from 'react'

interface ScrollButtonProps {
  targetId: string
  children: ReactNode
  // Default (filled) reads cleanly over the animated fabric; 'outline' for sections with a
  // solid background where the fabric can't bleed through a transparent button.
  variant?: 'default' | 'outline'
}

/** Smooth-scrolls to the next full-screen section by id — every section-to-section CTA
 * shares this one implementation. `size='lg'` is a real Button prop (the library's own size
 * scale), not a className override — every call site renders the same, unmodified Button. */
export function ScrollButton({ targetId, children, variant = 'default' }: ScrollButtonProps) {
  return (
    <Button
      type='button'
      size='lg'
      variant={variant}
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
    >
      {children}
    </Button>
  )
}
