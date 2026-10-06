'use client'

import { cn } from '@atta/ui/lib/utils'
import { type ReactNode, useRef } from 'react'
import { useSeen } from './LandingInteractions'

// The design's title reveal: a clip-path wipe, left to right, over 1100ms, once the section title's
// top passes 80% of the viewport. Under reduced motion `useSeen` is already true, so the title shows.
// `late` holds it back until the line before it has landed, so a title of two lines plays line by line.
export function WipeReveal({ children, late = false }: { children: ReactNode; late?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useSeen(ref, 0.8)

  return (
    <span
      ref={ref}
      className={cn(
        'block transition-[clip-path] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none',
        late && 'delay-[700ms]',
        seen ? '[clip-path:inset(-0.2em_-0.1em_-0.2em_0)]' : '[clip-path:inset(-0.2em_100%_-0.2em_0)]'
      )}
    >
      {children}
    </span>
  )
}
