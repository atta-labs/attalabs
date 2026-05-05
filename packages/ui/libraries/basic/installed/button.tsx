'use client'

import { cn } from '../../../lib/utils'
import React from 'react'

const variantClasses: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-border bg-background hover:bg-accent/20',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent',
  link: 'text-primary underline-offset-4 hover:underline'
}

const sizeClasses: Record<string, string> = {
  default: 'h-10 py-2 px-4',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10 p-0'
}

const buttonVariants = ({
  variant = 'default',
  size = 'default',
  className
}: {
  variant?: string
  size?: string
  className?: string
} = {}) => {
  const base =
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none'
  return cn(base, variantClasses[variant] ?? '', sizeClasses[size] ?? '', className)
}

type BaseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string
  size?: string
}

const Button = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />
  )
)

Button.displayName = 'Button'

export { Button, buttonVariants }
