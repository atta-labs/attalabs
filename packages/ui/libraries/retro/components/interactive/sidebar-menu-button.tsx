// retro's installed SidebarMenuButton composes via Radix `asChild` (Slot). The
// other three libraries (basic + animate/brutal falling back to basic) are Base
// UI and compose via the `render` prop. App code written against those libraries
// passes `render={<NextLink/>}` (e.g. Vinaya's DocSidebar/InstallSidebar), which
// retro's native signature rejects — a cross-library contract gap.
//
// This wrapper adapts that `render` idiom onto retro's `asChild`, so the SAME
// `render={<el/>}` call site type-checks and renders correctly under retro too,
// without touching the verbatim `installed/` file or any call site. `asChild`
// still works natively. Mirrors the Base-UI-adapter direction the library skill
// documents, in reverse (render -> asChild) since retro is the Radix flavor here.
import { cloneElement, isValidElement, type ComponentProps, type ReactElement } from 'react'
import { SidebarMenuButton as InstalledSidebarMenuButton } from '../../installed/sidebar'

export type SidebarMenuButtonProps = ComponentProps<typeof InstalledSidebarMenuButton> & {
  /** Base-UI-style composition: the element to render AS the button. Mapped to retro's `asChild`. */
  render?: ReactElement
}

export function SidebarMenuButton({ render, children, asChild, ...props }: SidebarMenuButtonProps) {
  if (render && isValidElement(render)) {
    // Render the given element AS the button (retro's Slot merges the button's
    // props onto it) and nest this component's children inside it — the same
    // result Base UI's `render` prop produces.
    return (
      <InstalledSidebarMenuButton asChild {...props}>
        {cloneElement(render, undefined, children)}
      </InstalledSidebarMenuButton>
    )
  }
  return (
    <InstalledSidebarMenuButton asChild={asChild} {...props}>
      {children}
    </InstalledSidebarMenuButton>
  )
}
