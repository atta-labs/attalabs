'use client'

import type { ButtonHTMLAttributes, HTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../../lib/utils'

export function InputGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border bg-card text-card-foreground focus-within:ring-1 focus-within:ring-ring',
        className
      )}
      {...props}
    />
  )
}

type InputGroupAddonProps = HTMLAttributes<HTMLDivElement> & {
  align?: string
}

export function InputGroupAddon({ className, align: _align, ...props }: InputGroupAddonProps) {
  return (
    <div
      className={cn('flex flex-row items-center px-2 py-1 border-t border-border first:border-t-0', className)}
      {...props}
    />
  )
}

const sizeMap: Record<string, string> = {
  default: 'h-9 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-10 px-6 text-sm',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-8 w-8 p-0'
}

const variantMap: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline'
}

type InputGroupButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string
  size?: string
}

export function InputGroupButton({ className, variant = 'ghost', size = 'default', ...props }: InputGroupButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
        variantMap[variant] ?? variantMap.ghost,
        sizeMap[size] ?? sizeMap.default,
        className
      )}
      {...props}
    />
  )
}

type InputGroupTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function InputGroupTextarea({ className, ...props }: InputGroupTextareaProps) {
  return (
    <textarea
      className={cn(
        'flex-1 resize-none bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none',
        className
      )}
      {...props}
    />
  )
}
