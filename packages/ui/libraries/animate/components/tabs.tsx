'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { Tabs } from '../../basic/installed/tabs'

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn('relative flex items-center gap-0 border-b border-border/20', className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator className='absolute bottom-0 left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)] bg-foreground transition-[left,width] duration-300 ease-in-out' />
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot='tabs-trigger'
      className={cn(
        'h-auto cursor-pointer rounded-none bg-transparent px-4 pt-0 pb-3',
        'font-mono text-[10px] tracking-widest uppercase',
        'text-foreground/40 transition-colors hover:bg-transparent hover:text-foreground/70',
        'data-[active]:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  children,
  motionProps,
  value,
  ...props
}: TabsPrimitive.Panel.Props & { motionProps?: HTMLMotionProps<'div'> }) {
  return (
    <TabsPrimitive.Panel data-slot='tabs-content' value={value} className={cn('outline-none', className)} {...props}>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        {...motionProps}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Panel>
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
