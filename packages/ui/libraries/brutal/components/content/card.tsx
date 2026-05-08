import { cn } from '../../../../lib/utils'
import type * as React from 'react'
import {
  Card as CardPrimitive,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction
} from '../../installed/card'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <CardPrimitive
      className={cn('bg-card border border-border [background:var(--card)!important]', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction }
