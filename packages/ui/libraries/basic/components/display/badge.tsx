'use client'

import { X, Loader2 } from 'lucide-react'
import React, { type MouseEvent, type ReactElement, useState } from 'react'
import { cn } from '../../../../lib/utils'
import type { BadgeProps, BadgeSize, BadgeAnimation, BadgeVariant } from '../../../../types'

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
  xl: 'px-5 py-2.5 text-lg',
  '2xl': 'px-6 py-3 text-xl'
}

const iconSizeClasses: Record<BadgeSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  '2xl': 'w-7 h-7'
}

const animationClasses: Record<BadgeAnimation, string> = {
  none: '',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  rotate: 'animate-spin',
  scale: 'hover:scale-110 transition-transform'
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border bg-background text-foreground',
  ai: 'text-white [background:linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)]',
  'ai-outline':
    'border border-transparent [background:linear-gradient(var(--background),var(--background))_padding-box,linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)_border-box] text-foreground'
}

export const Badge = React.forwardRef<HTMLElement, BadgeProps>(
  (
    {
      children,
      size = 'md',
      shape = 'rounded',
      animation = 'none',
      variant = 'default',
      radius,
      iconLeft,
      iconRight,
      badge,
      loading = false,
      className = '',
      opacity,
      animationDuration = 'normal',
      disabled = false,
      active = false,
      onDismiss,
      onHover,
      onClick,
      href,
      ...props
    },
    ref
  ) => {
    const [isDismissed, setIsDismissed] = useState(false)

    const handleDismiss = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setIsDismissed(true)
      onDismiss?.(event)
    }

    if (isDismissed) return null

    const hasCustomRadius = className && /rounded(-[a-z0-9[\]/]+)?/i.test(className)

    const getBorderRadius = () => {
      if (hasCustomRadius) return ''
      if (shape === 'pill' || shape === 'circle') return 'rounded-full'
      if (shape === 'square') return 'rounded-none'
      if (radius) {
        const map: Record<string, string> = {
          none: 'rounded-none',
          sm: 'rounded-sm',
          md: 'rounded-md',
          lg: 'rounded-lg',
          xl: 'rounded-xl',
          full: 'rounded-full'
        }
        return map[radius] ?? ''
      }
      return 'rounded-md'
    }

    const durationClasses: Record<string, string> = {
      fast: 'duration-150',
      normal: 'duration-300',
      slow: 'duration-500'
    }

    const iconSize = iconSizeClasses[size]

    const baseClasses = cn(
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      sizeClasses[size],
      getBorderRadius(),
      animationClasses[animation],
      durationClasses[animationDuration],
      variantClasses[variant],
      disabled && 'opacity-50 cursor-not-allowed',
      active && 'ring-2 ring-ring ring-offset-2',
      loading && 'cursor-wait',
      className
    )

    const positioningStyle: React.CSSProperties = {
      ...(opacity !== undefined && { opacity })
    }

    const content = (
      <>
        {loading ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : (
          iconLeft && (
            <span className='mr-1.5'>
              {React.cloneElement(
                iconLeft as ReactElement,
                { className: iconSize } as React.HTMLAttributes<HTMLElement>
              )}
            </span>
          )
        )}
        <span className='truncate'>{children}</span>
        {!loading && iconRight && (
          <span className='ml-1.5'>
            {React.cloneElement(
              iconRight as ReactElement,
              { className: iconSize } as React.HTMLAttributes<HTMLElement>
            )}
          </span>
        )}
        {badge && (
          <span className='ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-destructive rounded-full'>
            {badge}
          </span>
        )}
        {onDismiss && (
          <button
            type='button'
            aria-label='Dismiss'
            onClick={handleDismiss}
            className='ml-1.5 -mr-1 flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 focus:outline-none'
          >
            <X className={iconSize} />
          </button>
        )}
      </>
    )

    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={baseClasses}
          style={positioningStyle}
          onMouseEnter={onHover}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      )
    }

    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={onClick}
          className={baseClasses}
          style={positioningStyle}
          onMouseEnter={onHover}
          disabled={disabled || loading}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {content}
        </button>
      )
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={baseClasses}
        style={positioningStyle}
        onMouseEnter={onHover}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {content}
      </div>
    )
  }
)

Badge.displayName = 'Badge'
