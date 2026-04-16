import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

export function StickyHeaderTopBar({
  children,
  className,
  isBlurred = true
}: {
  children: ReactNode
  className?: string
  isBlurred?: boolean
}) {
  return (
    <header
      className={cn('sticky top-0 h-14 flex items-center', isBlurred && 'bg-background/10 backdrop-blur-xs', className)}
    >
      {children}
    </header>
  )
}
