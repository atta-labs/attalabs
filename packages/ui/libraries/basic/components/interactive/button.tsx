'use client'

import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { ButtonProps, ButtonSize, ButtonVariant } from '../../../../types'
import React, { useEffect, useState } from 'react'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-border bg-background hover:bg-accent/20',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  // `ghost` and `ghost-pill` share the same hover doctrine — canonical
  // shadcn pair: `hover:bg-accent hover:text-accent-foreground`. Both
  // variants apply the SAME hover so a topbar ghost icon, a smart-prompt
  // ghost-pill icon, and any other ghost-flavored Button feel identical
  // under the user's pointer. `ghost-pill` adds a persistent border + muted
  // baseline text on top — that's the only structural difference between
  // the two.
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  'ghost-pill': 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
  square: 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-none',
  ai: 'text-white [background:linear-gradient(90deg,#3b82f6,#8b5cf6,#a855f7,#d946ef)] hover:opacity-90'
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 py-2 px-4',
  xs: 'h-7 px-2 text-xs',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10 p-0',
  'icon-xs': 'h-7 w-7 p-0',
  'icon-sm': 'h-9 w-9 p-0',
  'icon-lg': 'h-11 w-11 p-0'
}

const buttonVariants = ({
  variant = 'default',
  size = 'default',
  className
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string => {
  const base =
    'relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-transform duration-75 focus:outline-none disabled:opacity-50 disabled:pointer-events-none overflow-hidden active:scale-[0.97] cursor-pointer'
  return cn(base, variantClasses[variant], sizeClasses[size], className)
}

interface Ripple {
  x: number
  y: number
  size: number
  id: number
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      className,
      variant = 'default',
      size = 'default',
      children,
      loading,
      iconLeft,
      iconRight,
      onClick,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot className={buttonVariants({ variant, size, className })} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <RippleButton
        ref={ref}
        className={className}
        variant={variant}
        size={size}
        loading={loading}
        iconLeft={iconLeft}
        iconRight={iconRight}
        onClick={onClick}
        {...props}
      >
        {children}
      </RippleButton>
    )
  }
)

Button.displayName = 'Button'

const RippleButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'asChild'>>(
  (
    { className, variant = 'default', size = 'default', children, loading, iconLeft, iconRight, onClick, ...props },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([])

    useEffect(() => {
      const styleId = 'ripple-animation-style'
      if (document.getElementById(styleId)) return
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
        @keyframes ripple-effect {
          from { transform: scale(0); opacity: 1; }
          to { transform: scale(2); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple-effect 0.7s ease-out forwards;
        }
      `
      document.head.appendChild(style)
    }, [])

    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) return
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const rippleSize = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - rippleSize / 2
      const y = event.clientY - rect.top - rippleSize / 2
      const newRipple: Ripple = { x, y, size: rippleSize, id: Date.now() }
      setRipples((current) => [...current, newRipple])
      setTimeout(() => setRipples((current) => current.slice(1)), 700)
      onClick?.(event)
    }

    const rippleColor =
      variant === 'default' || variant === 'destructive' ? 'bg-primary-foreground/30' : 'bg-foreground/10'

    return (
      <button
        className={buttonVariants({ variant, size, className })}
        onClick={createRipple}
        disabled={loading}
        ref={ref}
        {...props}
      >
        <span className='relative z-10 flex w-full items-center justify-center gap-2'>
          {loading && <Loader2 className='h-4 w-4 animate-spin' />}
          {!loading && iconLeft}
          {children}
          {!loading && iconRight}
        </span>
        {!loading && (
          <div className='absolute inset-0 z-0'>
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className={cn('absolute rounded-full animate-ripple', rippleColor)}
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: ripple.size,
                  height: ripple.size
                }}
              />
            ))}
          </div>
        )}
      </button>
    )
  }
)

RippleButton.displayName = 'RippleButton'

export { Button, buttonVariants }
