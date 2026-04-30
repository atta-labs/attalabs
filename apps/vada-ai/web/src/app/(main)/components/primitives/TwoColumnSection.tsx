import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

interface TwoColumnSectionProps {
  left: ReactNode
  right: ReactNode
  className?: string
}

export function TwoColumnSection({ left, right, className }: TwoColumnSectionProps) {
  return (
    <div className={cn('grid gap-12 md:grid-cols-2 md:gap-16 md:items-start', className)}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}
