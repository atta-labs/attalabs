import { Input as InputPrimitive } from '../../installed/input'
import { cn } from '../../../../lib/utils'
import type { InputBlockProps, InputProps } from '../../../../types'

function Input({ variant: _variant, size: _size, error, leftSection, rightSection, className, ...props }: InputProps) {
  if (!leftSection && !rightSection) {
    return <InputPrimitive className={cn(error && 'border-destructive', className)} {...props} />
  }
  return (
    <div className='w-full flex items-center gap-1'>
      {leftSection}
      <InputPrimitive className={cn('flex-1', error && 'border-destructive', className)} {...props} />
      {rightSection}
    </div>
  )
}
Input.displayName = 'Input'

function InputBlock({ className, leftSection, rightSection, error, children }: InputBlockProps) {
  return (
    <div className={cn('w-full flex gap-1 items-center', error && 'border-destructive', className)}>
      {leftSection}
      {children}
      {rightSection}
    </div>
  )
}
InputBlock.displayName = 'InputBlock'

export { Input, InputBlock }
