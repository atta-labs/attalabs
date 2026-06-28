import { cn } from '../../../../lib/utils'
import type { HeadingProps } from '../../../../types'
import * as React from 'react'

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

const weightClasses: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, size, weight = 'bold', className, children, ...props }, ref) => {
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    const sizeClass = size ? sizeClasses[size] : defaultSizeByLevel[level]

    return (
      <Tag ref={ref} className={cn(sizeClass, weightClasses[weight], 'tracking-tight', className)} {...props}>
        {children}
      </Tag>
    )
  }
)
Heading.displayName = 'Heading'

export { Heading }
