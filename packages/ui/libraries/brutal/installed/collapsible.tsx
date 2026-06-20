'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import * as React from 'react'

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />
}

function CollapsibleTrigger({
  render,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
  render?: React.ReactElement
}) {
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

function CollapsibleContent({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return <CollapsiblePrimitive.CollapsibleContent data-slot='collapsible-content' {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
