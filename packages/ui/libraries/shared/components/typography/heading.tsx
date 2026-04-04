import * as React from 'react'
import { cn } from '../../../../lib/utils'
import type { HeadingProps } from '../../../../types/typography/heading'

const defaultSizeByLevel: Record<number, string> = {
  1: 'text-4xl',
  2: 'text-3xl',
  3: 'text-2xl',
  4: 'text-xl',
  5: 'text-lg',
  6: 'text-base'
}

const sizeClasses: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl'
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(({ level = 2, size, className, ...props }, ref) => {
  const Tag = `h${level}` as const
  const sizeClass = size ? sizeClasses[size] : defaultSizeByLevel[level]

  return <Tag ref={ref} className={cn('font-bold tracking-tight', sizeClass, className)} {...props} />
})
Heading.displayName = 'Heading'

export { Heading }
