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
    <div
      className={`sticky top-0 h-14 flex items-center ${isBlurred ? 'bg-background/10 backdrop-blur-xs' : ''} ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
