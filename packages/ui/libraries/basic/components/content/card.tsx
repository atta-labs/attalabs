'use client'

import { cn } from '../../../../lib/utils'
import type * as React from 'react'
import {
  CardContent as CardContentPrimitive,
  CardDescription as CardDescriptionPrimitive,
  CardFooter as CardFooterPrimitive,
  CardHeader as CardHeaderPrimitive,
  Card as CardPrimitive,
  CardTitle as CardTitlePrimitive
} from '../../installed/card'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardPrimitive className={cn('bg-card border border-border', className)} {...props} />
}

export {
  CardContentPrimitive as CardContent,
  CardDescriptionPrimitive as CardDescription,
  CardFooterPrimitive as CardFooter,
  CardHeaderPrimitive as CardHeader,
  Card,
  CardTitlePrimitive as CardTitle
}
