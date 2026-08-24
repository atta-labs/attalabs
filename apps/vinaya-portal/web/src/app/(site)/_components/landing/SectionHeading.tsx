import { cn } from '@atta/ui/lib/utils'
import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'

// One canonical section-title style, used identically everywhere on the
// landing page. `className` is layout-only (max-w, alignment, spacing) by
// convention — but merged via cn() so a caller with a genuine reason (an
// explicit smaller-title request) can still override the size, rather than
// silently losing to source order in a plain string concat.
const TITLE_SIZE = 'text-4xl sm:text-5xl lg:text-6xl'

export function SectionOverline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={cn('font-mono text-[0.6875rem] uppercase tracking-[0.28em]', className)}>{children}</Text>
}

export function SectionTitle({
  children,
  leading = 'none',
  className = ''
}: {
  children: ReactNode
  leading?: 'none' | 'tight'
  className?: string
}) {
  return (
    <Heading
      level={2}
      weight='normal'
      className={cn(
        'font-serif tracking-tight',
        leading === 'tight' ? 'leading-tight' : 'leading-none',
        TITLE_SIZE,
        className
      )}
    >
      {children}
    </Heading>
  )
}
