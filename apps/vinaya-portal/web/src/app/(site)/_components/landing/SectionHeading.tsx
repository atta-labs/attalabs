import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'

// One canonical section-title style, used identically everywhere on the
// landing page. `className` is layout-only (max-w, alignment, spacing) —
// never a second size or weight, so every section title actually matches.
const TITLE_SIZE = 'text-4xl sm:text-5xl lg:text-6xl'

export function SectionOverline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`font-mono text-[0.6875rem] uppercase tracking-[0.28em] ${className}`}>{children}</Text>
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
      className={`font-serif tracking-tight ${leading === 'tight' ? 'leading-tight' : 'leading-none'} ${TITLE_SIZE} ${className}`}
    >
      {children}
    </Heading>
  )
}
