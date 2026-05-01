import NextLinkPrimitive from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from './utils'

export type NextLinkVariant = 'prose' | 'nav' | 'subtle' | 'card' | 'destructive' | 'unstyled'

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
  unstyled: ''
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
