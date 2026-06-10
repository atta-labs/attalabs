'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import * as React from 'react'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} asChild>
      <motion.div
        className={cn(
          'z-50 w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          'origin-[--radix-popover-content-transform-origin]',
          className
        )}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        {...(props as any)}
      />
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
