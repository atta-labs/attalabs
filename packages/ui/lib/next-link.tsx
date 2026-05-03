import NextLinkPrimitive from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from './utils'

export type NextLinkVariant = 'prose' | 'nav' | 'subtle' | 'card' | 'destructive' | 'unstyled' | 'button'

export type NextLinkProps = ComponentProps<typeof NextLinkPrimitive> & {
  variant?: NextLinkVariant
  active?: boolean
}

const variants: Record<NextLinkVariant, string> = {
  prose: 'text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors',
  nav: 'text-muted-foreground transition-colors hover:text-accent',
  subtle: 'font-mono text-xs text-muted-foreground transition-colors hover:text-accent',
  card: 'block transition-opacity hover:opacity-80',
  destructive: 'text-destructive/70 underline transition-opacity hover:opacity-70',
  unstyled: '',
  button:
    'relative inline-flex items-center justify-center rounded-md text-sm font-medium cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-transform duration-75 active:scale-[0.97]'
}

const activeNav = 'text-primary font-medium'

export function NextLink({ variant = 'prose', active, className, ...props }: NextLinkProps) {
  return (
    <NextLinkPrimitive
      className={cn(variants[variant], variant === 'nav' && active && activeNav, className)}
      {...props}
    />
  )
}
