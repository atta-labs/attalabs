import { cn } from '@atta/ui/lib/utils'
import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'

// One canonical section-title style, used identically everywhere on the
// landing page. `className` is layout-only (max-w, alignment, spacing) by
// convention — but merged via cn() so a caller with a genuine reason (an
// explicit smaller-title request) can still override the size, rather than
// silently losing to source order in a plain string concat.
const TITLE_SIZE = 'text-4xl sm:text-5xl lg:text-6xl'
// The full-page motion design's title: one step down, fluid between 2.25rem and 2.75rem.
const TITLE_SIZE_COMPACT = 'text-[clamp(2.25rem,3.4vw,2.75rem)] leading-[1.08] tracking-[-0.04em] text-balance'

export function SectionOverline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={cn('font-mono text-[0.6875rem] uppercase tracking-[0.28em]', className)}>{children}</Text>
}

export function SectionTitle({
  children,
  leading = 'none',
  size = 'default',
  letterReveal = false,
  className = ''
}: {
  children: ReactNode
  leading?: 'none' | 'tight'
  size?: 'default' | 'compact'
  /** Marks the heading as the one a scene drives letter by letter (`merge-scene.js` looks for it). */
  letterReveal?: boolean
  className?: string
}) {
  return (
    <Heading
      level={2}
      weight='normal'
      data-letter-reveal={letterReveal ? '1' : undefined}
      className={cn(
        'font-serif',
        size === 'compact'
          ? TITLE_SIZE_COMPACT
          : ['tracking-tight', leading === 'tight' ? 'leading-tight' : 'leading-none', TITLE_SIZE],
        className
      )}
    >
      {children}
    </Heading>
  )
}

// A section's heading block: title, then subtitle, with the design's tight centered gap
// (`gap-2.5`) — left-aligned pinned layouts keep the roomier `gap-6`.
export function SectionHeader({
  children,
  centered = true,
  className = ''
}: {
  children: ReactNode
  centered?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col', centered ? 'items-center gap-2.5 text-center' : 'gap-6 text-left', className)}>
      {children}
    </div>
  )
}

export function SectionSubtitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={cn('text-balance text-xl leading-snug tracking-tight', className)}>{children}</Text>
}
