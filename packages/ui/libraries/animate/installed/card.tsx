'use client'

import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const hoverProps = {
  whileHover: { y: -2, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } }
}

const Card = ({ className, ...props }: CardProps) => (
  <motion.div
    className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}
    {...hoverProps}
    {...(props as any)}
  />
)

const CardHeader = ({ className, ...props }: CardProps) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
)

const CardTitle = ({ className, children, ...props }: CardProps) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
    {children}
  </h3>
)

const CardDescription = ({ className, ...props }: CardProps) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)

const CardAction = ({ className, ...props }: CardProps) => (
  <div className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)} {...props} />
)

const CardContent = ({ className, ...props }: CardProps) => <div className={cn('p-6 pt-0', className)} {...props} />

const CardFooter = ({ className, ...props }: CardProps) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
)

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
