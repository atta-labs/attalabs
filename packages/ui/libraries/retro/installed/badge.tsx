'use client'

import { cn } from '../../../lib/utils'
import type { BadgeProps } from '../../../types'
import React from 'react'

const sizeClasses: Record<string, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
  xl: 'px-5 py-2.5 text-lg',
  '2xl': 'px-6 py-3 text-xl'
}

const variantClasses: Record<string, string> = {
  default: 'bg-primary text-primary-foreground border-2 border-border',
  secondary: 'bg-secondary text-secondary-foreground border-2 border-border',
  destructive: 'bg-destructive text-destructive-foreground border-2 border-border',
  outline: 'bg-transparent text-foreground border-2 border-border',
  ai: 'text-white [background:linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)] border-2 border-border',
  'ai-outline':
    'border-2 border-transparent [background:linear-gradient(var(--background),var(--background))_padding-box,linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)_border-box] text-foreground'
}

const Badge = React.forwardRef<HTMLElement, BadgeProps>(
  (
    {
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
    },
    ref
  ) => {
    const classes = cn(
      'inline-flex items-center justify-center font-semibold rounded transition-all',
      sizeClasses[size ?? 'md'],
      variantClasses[variant ?? 'default'],
      className
    )

    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          onMouseEnter={onHover}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      )
    }

    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={onClick}
          className={classes}
          onMouseEnter={onHover}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      )
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={classes}
        onMouseEnter={onHover}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
