import { cn } from '@atta/ui/lib/utils'
import type { ReactNode, Ref } from 'react'

// The one shell every non-scroll-pinned landing section shares: a full-bleed
// <section> for the background token, a centered max-width container for the
// content. `LifecycleSection`/`OwnershipSection` stay OUT of this — their
// sticky/h-[300dvh] scroll-pin shell is a structurally different section
// type, not a variant of this one. The hero stays out too — no container at
// all, it's a full-bleed canvas.
const PY_SCALE = {
  compact: 'py-8',
  default: 'py-14 sm:py-20 lg:py-24',
  spacious: 'py-16 sm:py-24 lg:py-28'
} as const

interface LandingSectionProps {
  id?: string
  ref?: Ref<HTMLElement>
  /** Full `bg-* text-*` token pair — this is the one thing every section chooses independently. */
  background: string
  py?: keyof typeof PY_SCALE
  /** Text-centers the whole container. Omit for sections that only center part of their content
   * (e.g. a two-column grid where just one side centers on mobile) — compose that locally instead. */
  center?: boolean
  className?: string
  children: ReactNode
}

export function LandingSection({
  id,
  ref,
  background,
  py = 'default',
  center,
  className,
  children
}: LandingSectionProps) {
  return (
    <section id={id} ref={ref} className={background}>
      <div className={cn('mx-auto max-w-[73.75rem] px-6 sm:px-10', PY_SCALE[py], center && 'text-center', className)}>
        {children}
      </div>
    </section>
  )
}
