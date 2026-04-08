import { cn } from '../../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'size-full bg-transparent ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none text-base',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

const rootVariants = cva('py-1 px-2 flex gap-1 items-center transition duration-200', {
  variants: {
    variant: {
      // outline
      default:
        'border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background rounded-[var(--radius)]',
      underlined:
        'border-b border-input bg-transparent focus-within:border-b-2 focus-within:border-ring rounded-none px-0',
      filled: 'bg-muted text-foreground focus-within:bg-muted/80 rounded-[var(--radius)]',
      ghost: 'bg-transparent text-foreground focus-within:bg-muted rounded-[var(--radius)]',
      neubrutalism:
        'border border-foreground rounded-sm shadow-[2px_2px_0px_hsl(var(--muted-foreground))] focus-within:bg-accent/20'
      // with floating label
    },
    size: {
      sm: 'h-8',
      default: 'h-10',
      lg: 'h-12'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
})

type InputBlockProps = {
  className?: string
  leftSection?: React.ReactNode
  rightSection?: React.ReactNode
  children: React.ReactNode
} & VariantProps<typeof rootVariants>

const InputBlock = ({ size, variant, className = '', leftSection, rightSection, children }: InputBlockProps) => (
  <div className={cn('w-full', rootVariants({ variant, size }), className)}>
    {leftSection && leftSection}
    {children}
    {rightSection && rightSection}
  </div>
)

export { Input, InputBlock }

Input.displayName = 'Input'
InputBlock.displayName = 'InputBlock'
