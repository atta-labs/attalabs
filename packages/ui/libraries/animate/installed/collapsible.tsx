'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { useControlledState } from '../../../hooks/use-controlled-state'
import { AnimatePresence, type HTMLMotionProps, motion } from 'framer-motion'
import * as React from 'react'

type CollapsibleContextType = {
  isOpen: boolean
}

const CollapsibleContext = React.createContext<CollapsibleContextType | null>(null)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error('useCollapsible must be used within a Collapsible')
  return context
}

type CollapsibleProps = React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>

function Collapsible({ open, defaultOpen, onOpenChange, ...props }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange
  })

  return (
    <CollapsibleContext.Provider value={{ isOpen: isOpen ?? false }}>
      <CollapsiblePrimitive.Root data-slot='collapsible' open={isOpen} onOpenChange={setIsOpen} {...props} />
    </CollapsibleContext.Provider>
  )
}

type CollapsibleTriggerProps = React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
  render?: React.ReactElement
}

function CollapsibleTrigger({ render, children, ...props }: CollapsibleTriggerProps) {
  if (render) {
    return (
      <CollapsiblePrimitive.CollapsibleTrigger asChild {...props}>
        {React.cloneElement(render, {}, children)}
      </CollapsiblePrimitive.CollapsibleTrigger>
    )
  }
  return (
    <CollapsiblePrimitive.CollapsibleTrigger data-slot='collapsible-trigger' {...props}>
      {children}
    </CollapsiblePrimitive.CollapsibleTrigger>
  )
}

type CollapsibleContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  'forceMount'
> &
  HTMLMotionProps<'div'> & {
    keepRendered?: boolean
  }

function CollapsibleContent({
  keepRendered = false,
  transition = { duration: 0.35, ease: 'easeInOut' },
  children,
  ...props
}: CollapsibleContentProps) {
  const { isOpen } = useCollapsible()

  return (
    <AnimatePresence>
      {(keepRendered || isOpen) && (
        <CollapsiblePrimitive.CollapsibleContent asChild forceMount>
          <motion.div
            key='collapsible-content'
            data-slot='collapsible-content'
            initial={{ height: 0, opacity: 0, '--mask-stop': '0%', y: 20 } as any}
            animate={
              isOpen
                ? ({ height: 'auto', opacity: 1, '--mask-stop': '100%', y: 0 } as any)
                : ({ height: 0, opacity: 0, '--mask-stop': '0%', y: 20 } as any)
            }
            exit={{ height: 0, opacity: 0, '--mask-stop': '0%', y: 20 } as any}
            transition={transition}
            style={{
              maskImage: 'linear-gradient(black var(--mask-stop), transparent var(--mask-stop))',
              WebkitMaskImage: 'linear-gradient(black var(--mask-stop), transparent var(--mask-stop))',
              overflow: 'hidden'
            }}
            {...props}
          >
            {children}
          </motion.div>
        </CollapsiblePrimitive.CollapsibleContent>
      )}
    </AnimatePresence>
  )
}

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
  type CollapsibleContentProps,
  type CollapsibleProps,
  type CollapsibleTriggerProps
}
