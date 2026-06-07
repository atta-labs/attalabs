import { cn } from '../../../../lib/utils'
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../installed/card'
import type { HTMLAttributes } from 'react'

interface ICardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

function Card({ className, ...props }: ICardProps) {
  return (
    <div
      className={cn(
        'border-2 border-border rounded shadow-[4px_4px_0px_0px_var(--border)] transition-all hover:shadow-[2px_2px_0px_0px_var(--border)] bg-card',
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: ICardProps) {
  return <div className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
