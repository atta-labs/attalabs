import { cn } from '@atta/ui/lib/utils'

interface PennantProps {
  /** Visual scale: sm=16px wide, md=20px wide, lg=24px wide. */
  size?: 'sm' | 'md' | 'lg'
  /** Semantic fill token. */
  tone?: 'primary' | 'muted' | 'destructive'
  /** Gentle sway loop. Respects prefers-reduced-motion. */
  animated?: boolean
  className?: string
}

const dimensions = {
  sm: { width: 16, height: 22 },
  md: { width: 20, height: 28 },
  lg: { width: 24, height: 34 }
} as const

const toneClass = {
  primary: 'text-primary',
  muted: 'text-muted-foreground',
  destructive: 'text-destructive'
} as const

export function Pennant({ size = 'md', tone = 'primary', animated = false, className }: PennantProps) {
  const { width, height } = dimensions[size]
  return (
    <svg
      viewBox='0 0 20 28'
      width={width}
      height={height}
      aria-hidden
      className={cn(toneClass[tone], animated && 'pennant-sway', className)}
    >
      <path d='M1 1 H19 V24 L10 17.5 L1 24 Z' fill='currentColor' />
    </svg>
  )
}
