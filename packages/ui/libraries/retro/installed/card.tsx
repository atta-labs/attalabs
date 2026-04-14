import { cn } from '../../../lib/utils'
import type { HTMLAttributes } from 'react'

interface ICardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Card = ({ className, ...props }: ICardProps) => {
  return (
    <div
      className={cn('inline-block border-2 rounded shadow-md transition-all hover:shadow-none bg-card', className)}
      {...props}
    />
  )
}

const CardHeader = ({ className, ...props }: ICardProps) => {
  return <div className={cn('flex flex-col justify-start p-4', className)} {...props} />
}

const CardTitle = ({ className, children, ...props }: ICardProps) => {
  return (
    <h3 className={cn('mb-2 text-base font-medium', className)} {...props}>
      {children}
    </h3>
  )
}

const CardDescription = ({ className, ...props }: ICardProps) => (
  <p className={cn('text-muted-foreground', className)} {...props} />
)

const CardContent = ({ className, ...props }: ICardProps) => {
  return <div className={cn('p-4', className)} {...props} />
}

const CardFooter = ({ className, ...props }: ICardProps) => {
  return <div className={cn('flex items-center p-4 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
