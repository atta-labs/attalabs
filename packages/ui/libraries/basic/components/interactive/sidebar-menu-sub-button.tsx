import type { ComponentProps } from 'react'
import { SidebarMenuSubButton as InstalledSidebarMenuSubButton } from '../../installed/sidebar'
import { resolveSingleChild } from '../as-child'

// asChild → render adapter for basic's Base UI SidebarMenuSubButton. See ../as-child.
// installed/sidebar.tsx stays a verbatim Base UI paste; the adapter
// lives in this wrapper. All other SidebarMenu* components are plain re-exports.
function SidebarMenuSubButton({
  asChild,
  children,
  render,
  ...props
}: ComponentProps<typeof InstalledSidebarMenuSubButton> & { asChild?: boolean }) {
  const resolvedRender = render ?? (asChild ? resolveSingleChild(children) : undefined)
  return (
    <InstalledSidebarMenuSubButton render={resolvedRender} {...props}>
      {resolvedRender ? undefined : children}
    </InstalledSidebarMenuSubButton>
  )
}

export { SidebarMenuSubButton }
