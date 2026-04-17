import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

interface SectionWrapperProps {
  id?: string
  children: ReactNode
  className?: string
  innerClassName?: string
}

export function SectionWrapper({ id, children, className, innerClassName }: SectionWrapperProps) {
  return (
    <section id={id} className={cn('bg-background py-24 md:py-32', className)}>
      <div className={cn('mx-auto max-w-6xl px-6', innerClassName)}>{children}</div>
    </section>
  )
}
