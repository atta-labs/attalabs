'use client'

import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import type { BadgeProps } from '../../../types'

const sizeClasses: Record<string, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
  xl: 'px-5 py-2.5 text-lg',
  '2xl': 'px-6 py-3 text-xl'
}

const variantClasses: Record<string, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border bg-background text-foreground',
  ai: 'text-white [background:linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)]',
  'ai-outline':
    'border border-transparent [background:linear-gradient(var(--background),var(--background))_padding-box,linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)_border-box] text-foreground'
}

const motionProps = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 17 }
}

function Badge({
  children,
  size = 'md',
  variant = 'default',
  className = '',
  onClick,
  href,
  onHover,
  loading: _l,
  iconLeft: _il,
  iconRight: _ir,
  badge: _b,
  onDismiss: _od,
  animation: _a,
  animationDuration: _ad,
  shape: _s,
  radius: _r,
  opacity: _o,
  disabled: _d,
  active: _ac,
  ...props
}: BadgeProps) {
  const classes = cn(
    'inline-flex items-center justify-center font-medium rounded-md transition-all',
    sizeClasses[size ?? 'md'],
    variantClasses[variant ?? 'default'],
    className
  )

  if (href) {
    return (
      <motion.a href={href} className={classes} onMouseEnter={onHover} {...motionProps} {...(props as any)}>
        {children}
      </motion.a>
    )
  }

  if (onClick) {
    return (
      <motion.button
        onClick={onClick as any}
        className={classes}
        onMouseEnter={onHover}
        {...motionProps}
        {...(props as any)}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <motion.div className={classes} onMouseEnter={onHover} {...motionProps} {...(props as any)}>
      {children}
    </motion.div>
  )
}

export { Badge }
