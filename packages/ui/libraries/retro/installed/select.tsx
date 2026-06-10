'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '../../../lib/utils'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import type * as React from 'react'

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot='select' {...props} />
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot='select-group' {...props} />
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot='select-value' {...props} />
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot='select-trigger'
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded border-2 border-border bg-transparent px-3 py-2 text-sm',
        'shadow-[4px_4px_0px_0px_var(--border)] focus:shadow-[2px_2px_0px_0px_var(--border)] transition-all',
        'outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'data-[placeholder]:text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className='size-4 shrink-0' />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot='select-scroll-up-button'
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUp className='size-4' />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot='select-scroll-down-button'
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDown className='size-4' />
    </SelectPrimitive.ScrollDownButton>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot='select-content'
        position={position}
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden border-2 border-border bg-background text-foreground',
          'shadow-[4px_4px_0px_0px_var(--border)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot='select-item'
      className={cn(
        'relative flex w-full cursor-default select-none items-center py-1.5 pl-2 pr-8 text-sm outline-none',
        'data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground',
        'focus:bg-primary focus:text-primary-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <span className='absolute right-2 flex h-3.5 w-3.5 items-center justify-center'>
        <SelectPrimitive.ItemIndicator>
          <Check className='size-4' />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot='select-label'
      className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot='select-separator'
      className={cn('my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator
}
