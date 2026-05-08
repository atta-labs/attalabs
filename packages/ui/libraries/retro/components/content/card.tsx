import { cn } from '../../../../lib/utils'
import type * as React from 'react'
import {
  Card as CardPrimitive,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '../../installed/card'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <CardPrimitive
      className={cn('bg-card border border-border [background:var(--card)!important]', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
