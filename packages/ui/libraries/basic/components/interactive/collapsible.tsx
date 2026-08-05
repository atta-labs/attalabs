import type { ComponentProps } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger as InstalledCollapsibleTrigger
} from '../../installed/collapsible'
import { resolveSingleChild } from '../as-child'

// asChild → render adapter for basic's Base UI CollapsibleTrigger. See ../as-child.
// installed/collapsible.tsx stays a verbatim Base UI paste; the adapter
// lives in this wrapper. Collapsible + CollapsibleContent are plain re-exports.
function CollapsibleTrigger({
  asChild,
  children,
  render,
  ...props
}: ComponentProps<typeof InstalledCollapsibleTrigger> & { asChild?: boolean }) {
  const resolvedRender = render ?? (asChild ? resolveSingleChild(children) : undefined)
  return (
    <InstalledCollapsibleTrigger render={resolvedRender} {...props}>
      {resolvedRender ? undefined : children}
    </InstalledCollapsibleTrigger>
  )
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
