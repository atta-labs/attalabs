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
      className={cn('bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction }
