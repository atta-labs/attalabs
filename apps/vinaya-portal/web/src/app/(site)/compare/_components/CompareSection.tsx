import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

// Page-local section shell, deliberately not the landing `LandingSection` —
// this route has no scroll-pinned sections and no per-section background
// token choice, so a simpler fixed-token wrapper is all it needs.
export function CompareSection({
  id,
  alt,
  className,
  children
}: {
  id?: string
  /** Alternates the section background so the seven sections read as distinct bands. */
  alt?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={alt ? 'bg-card text-card-foreground' : 'bg-background text-foreground'}>
      <div className={cn('mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24', className)}>{children}</div>
    </section>
  )
}
