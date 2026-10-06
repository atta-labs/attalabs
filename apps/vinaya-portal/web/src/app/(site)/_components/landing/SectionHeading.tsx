import { cn } from '@atta/ui/lib/utils'
import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { WipeReveal } from './WipeReveal'

// One canonical section-title style, used identically everywhere on the
// landing page. `className` is layout-only (max-w, alignment, spacing) by
// convention — but merged via cn() so a caller with a genuine reason (an
// explicit smaller-title request) can still override the size, rather than
// silently losing to source order in a plain string concat.
const TITLE_SIZE = 'text-4xl sm:text-5xl lg:text-6xl'
// The full-page motion design's title: the same size scale as `/life-cycle`'s section titles (the
// design's own 2.25-2.75rem clamp read too small next to them), in sans with the tighter set.
const TITLE_SIZE_COMPACT = `${TITLE_SIZE} leading-[1.08] tracking-[-0.04em] text-balance`

// The space between a section's heading block (title and subtitle) and the content under it. One value for
// every section, so none of them sits tighter than the rest: 2rem on a short window, up to 3rem on a tall one.
export const HEADER_GAP = 'gap-[clamp(2rem,5vh,3rem)]'
export const HEADER_MARGIN = 'mt-[clamp(2rem,5vh,3rem)]'

export function SectionOverline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={cn('font-mono text-sm uppercase tracking-[0.28em]', className)}>{children}</Text>
}

export function SectionTitle({
  children,
  leading = 'none',
  size = 'default',
  letterReveal = false,
  wipe = true,
  className = ''
}: {
  children: ReactNode
  leading?: 'none' | 'tight'
  size?: 'default' | 'compact'
  /** Marks the heading as the one a scene drives letter by letter (`merge-scene.js` looks for it). */
  letterReveal?: boolean
  /** The default clip-path wipe over the whole title; off when the caller wipes its lines one by one. */
  wipe?: boolean
  className?: string
}) {
  return (
    <Heading
      level={2}
      weight='normal'
      data-letter-reveal={letterReveal ? '1' : undefined}
      className={cn(
        size === 'compact' ? 'font-sans' : 'font-serif',
        size === 'compact'
          ? TITLE_SIZE_COMPACT
          : ['tracking-tight', leading === 'tight' ? 'leading-tight' : 'leading-none', TITLE_SIZE],
        className
      )}
    >
      {size === 'compact' && !letterReveal && wipe ? <WipeReveal>{children}</WipeReveal> : children}
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
  return (
    <Text className={cn('text-balance text-2xl leading-snug tracking-tight sm:text-[1.75rem]', className)}>
      {children}
    </Text>
  )
}
