'use client'

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react'
import type * as React from 'react'

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot='dropdown-menu' {...props} />
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot='dropdown-menu-portal' {...props} />
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot='dropdown-menu-trigger' {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content data-slot='dropdown-menu-content' sideOffset={sideOffset} asChild>
        <motion.div
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md',
            className
          )}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          {...(props as any)}
        />
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot='dropdown-menu-group' {...props} />
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot='dropdown-menu-sub' {...props} />
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot='dropdown-menu-radio-group' {...props} />
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot='dropdown-menu-item'
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot='dropdown-menu-checkbox-item'
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className
      )}
      checked={checked}
      {...props}
    >
      <span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className='size-4' />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot='dropdown-menu-radio-item'
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className='size-2 fill-current' />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot='dropdown-menu-label'
      className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', inset && 'pl-8', className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot='dropdown-menu-separator'
      className={cn('my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='dropdown-menu-shortcut'
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  )
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot='dropdown-menu-sub-trigger'
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'focus:bg-accent data-[state=open]:bg-accent',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className='ml-auto size-4' />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot='dropdown-menu-sub-content'
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
}
