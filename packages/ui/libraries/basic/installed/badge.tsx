'use client'

import React, { type MouseEvent, type ReactElement, type ReactNode, useState } from 'react'
import { cn } from '../../../lib/utils'

// Enhanced Icons
const XIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
  >
    <line x1='18' y1='6' x2='6' y2='18' />
    <line x1='6' y1='6' x2='18' y2='18' />
  </svg>
)

const LoadingIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={`${className} animate-spin`}
  >
    <path d='M21 12a9 9 0 11-6.219-8.56' />
  </svg>
)

// Enhanced Types
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type BadgeShape = 'rounded' | 'pill' | 'square' | 'circle'
type BadgeAnimation = 'none' | 'pulse' | 'bounce' | 'rotate' | 'scale'
type BadgePosition = 'static' | 'absolute' | 'fixed' | 'sticky'
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ai' | 'ai-outline'

// Enhanced Badge Props Interface
interface BadgeBaseProps {
  children: ReactNode
  size?: BadgeSize
  shape?: BadgeShape
  animation?: BadgeAnimation
  position?: BadgePosition
  variant?: BadgeVariant
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

  // Icons and Content
  iconLeft?: ReactElement
  iconRight?: ReactElement
  badge?: string | number
  loading?: boolean

  // Styling
  className?: string
  style?: React.CSSProperties

  // Styling Effects
  opacity?: number

  // Animation Options
  animationDuration?: 'fast' | 'normal' | 'slow'

  // Interactive States
  disabled?: boolean
  active?: boolean

  // Events
  onDismiss?: (event: MouseEvent<HTMLButtonElement>) => void
  onHover?: (event: MouseEvent<HTMLElement>) => void
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void

  // Accessibility
  'aria-label'?: string
  'aria-describedby'?: string
  role?: string

  top?: string | number
  right?: string | number
  bottom?: string | number
  left?: string | number
  zIndex?: number
}

type BadgeActionProps =
  | ({ onClick: (event: MouseEvent<HTMLButtonElement>) => void; href?: never } & Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      'onClick'
    >)
  | ({ href: string; onClick?: never } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)
  | ({ href?: undefined; onClick?: undefined } & React.HTMLAttributes<HTMLDivElement>)

export type BadgeProps = BadgeBaseProps & BadgeActionProps

export const Badge = React.forwardRef<HTMLElement, BadgeProps>(
  (
    {
      children,
      size = 'md',
      shape = 'rounded',
      animation = 'none',
      position = 'static',
      variant = 'default',
      radius,
      iconLeft,
      iconRight,
      badge,
      loading = false,
      className = '',
      style = {},
      opacity,
      animationDuration = 'normal',
      disabled = false,
      active = false,
      onDismiss,
      onHover,
      onFocus,
      onClick,
      href,
      top,
      right,
      bottom,
      left,
      zIndex,
      ...props
    },
    ref
  ) => {
    const [isDismissed, setIsDismissed] = useState(false)

    // Handle dismiss functionality
    const handleDismiss = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setIsDismissed(true)
      onDismiss?.(event)
    }

    // Don't render if dismissed
    if (isDismissed) return null

    // Enhanced Size Styles
    const sizeStyles: Record<BadgeSize, string> = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2.5 py-0.5 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
      xl: 'px-5 py-2.5 text-lg',
      '2xl': 'px-6 py-3 text-xl'
    }

    // Enhanced Icon Sizes
    const iconSizeStyles: Record<BadgeSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
      '2xl': 'w-7 h-7'
    }

    // Helper to check if className has a rounded-* utility
    const hasCustomRadius = className && /rounded(-[a-z0-9[\]/]+)?/i.test(className)

    const getBorderRadius = () => {
      if (hasCustomRadius) {
        // User provided their own className with rounded-*, don't add anything
        return ''
      }
      // Shape-based rules always take precedence
      if (shape === 'pill' || shape === 'circle') {
        return 'rounded-full'
      }
      if (shape === 'square') {
        return 'rounded-none'
      }
      // Explicit radius prop overrides theme, but not pill/circle/square
      if (radius) {
        const radiusStyles: Record<string, string> = {
          none: 'rounded-none',
          sm: 'rounded-sm',
          md: 'rounded-md',
          lg: 'rounded-lg',
          xl: 'rounded-xl',
          full: 'rounded-full'
        }
        return radiusStyles[radius]
      }
      // Only if shape is rounded and no explicit radius, use theme radius
      return 'rounded-md'
    }

    const borderRadius = getBorderRadius()

    // Animation Styles - using only standard Tailwind animations
    const animationStyles: Record<BadgeAnimation, string> = {
      none: '',
      pulse: 'animate-pulse',
      bounce: 'animate-bounce',
      rotate: 'animate-spin',
      scale: 'hover:scale-110 transition-transform'
    }

    // Animation Duration Styles
    const durationStyles: Record<string, string> = {
      fast: 'duration-150',
      normal: 'duration-300',
      slow: 'duration-500'
    }

    // Position Styles
    const positionStyles: Record<BadgePosition, string> = {
      static: 'static',
      absolute: 'absolute',
      fixed: 'fixed',
      sticky: 'sticky'
    }

    // Get icon size based on badge size
    const iconSize = iconSizeStyles[size]

    // Variant Styles - following theme system like Button component
    const variantStyles: Record<BadgeVariant, string> = {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      outline: 'border border-border bg-background text-foreground',
      ai: 'text-white [background:linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)]',
      'ai-outline':
        'border border-transparent [background:linear-gradient(var(--background),var(--background))_padding-box,linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)_border-box] text-foreground'
    }

    const baseClasses = cn(
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      sizeStyles[size],
      borderRadius,
      animationStyles[animation],
      durationStyles[animationDuration],
      positionStyles[position],
      variantStyles[variant],
      disabled && 'opacity-50 cursor-not-allowed',
      active && 'ring-2 ring-ring ring-offset-2',
      loading && 'cursor-wait',
      className
    )

    // Add positioning styles if needed
    const positioningStyles: React.CSSProperties = {
      ...style,
      ...(top !== undefined && { top }),
      ...(right !== undefined && { right }),
      ...(bottom !== undefined && { bottom }),
      ...(left !== undefined && { left }),
      ...(zIndex !== undefined && { zIndex }),
      ...(opacity !== undefined && { opacity })
    }

    const finalClassName = baseClasses
    const finalStyle = positioningStyles

    // Render different components based on props
    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={finalClassName}
          style={finalStyle}
          onMouseEnter={onHover}
          onFocus={onFocus}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {loading ? (
            <LoadingIcon className={iconSize} />
          ) : (
            iconLeft && (
              <span className='mr-1.5'>
                {React.cloneElement(iconLeft, { className: iconSize } as React.HTMLAttributes<HTMLElement>)}
              </span>
            )
          )}
          <span className='truncate'>{children}</span>
          {!loading && iconRight && (
            <span className='ml-1.5'>
              {React.cloneElement(iconRight, { className: iconSize } as React.HTMLAttributes<HTMLElement>)}
            </span>
          )}
          {badge && (
            <span className='ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full'>
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
              <XIcon className={iconSize} />
            </button>
          )}
        </a>
      )
    }

    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={onClick}
          className={finalClassName}
          style={finalStyle}
          onMouseEnter={onHover}
          onFocus={onFocus}
          disabled={disabled || loading}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {loading ? (
            <LoadingIcon className={iconSize} />
          ) : (
            iconLeft && (
              <span className='mr-1.5'>
                {React.cloneElement(iconLeft, { className: iconSize } as React.HTMLAttributes<HTMLElement>)}
              </span>
            )
          )}
          <span className='truncate'>{children}</span>
          {!loading && iconRight && (
            <span className='ml-1.5'>
              {React.cloneElement(iconRight, { className: iconSize } as React.HTMLAttributes<HTMLElement>)}
            </span>
          )}
          {badge && (
            <span className='ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full'>
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
              <XIcon className={iconSize} />
            </button>
          )}
        </button>
      )
    }

    // For static badges, only add interactive handlers if they're actually needed
    const hasInteractiveHandlers = onHover || onFocus
    const staticProps = hasInteractiveHandlers
      ? {
          onMouseEnter: onHover,
          onFocus: onFocus,
          tabIndex: 0, // Make focusable if it has focus handler
          role: 'button' // Indicate it's interactive
        }
      : {}

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={finalClassName}
        style={finalStyle}
        {...staticProps}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {loading ? (
          <LoadingIcon className={iconSize} />
        ) : (
          iconLeft && (
            <span className='mr-1.5'>
              {React.cloneElement(iconLeft, { className: iconSize } as React.HTMLAttributes<HTMLElement>)}
            </span>
          )
        )}
        <span className='truncate'>{children}</span>
        {!loading && iconRight && (
          <span className='ml-1.5'>
            {React.cloneElement(iconRight, { className: iconSize } as React.HTMLAttributes<HTMLElement>)}
          </span>
        )}
        {badge && (
          <span className='ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full'>
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
            <XIcon className={iconSize} />
          </button>
        )}
      </div>
    )
  }
)

Badge.displayName = 'Badge'
