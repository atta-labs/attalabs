'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { Tabs, TabsList, TabsTrigger } from '../../basic/installed/tabs'

type TabsContentProps = TabsPrimitive.Panel.Props & {
  motionProps?: HTMLMotionProps<'div'>
}

function TabsContent({ className, children, motionProps, value, ...props }: TabsContentProps) {
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
