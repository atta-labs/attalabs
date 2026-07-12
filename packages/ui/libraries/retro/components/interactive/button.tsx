import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../../../lib/utils'
import { Button as InstalledButton, buttonVariants } from '../../installed/button'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// retroui CLI paste) — see basic/components/interactive/button.tsx for the
// leading-none rationale AND the required cn(className, 'leading-none')
// argument order (a caller's text-size class silently wins over a
// leading-none passed BEFORE it in tailwind-merge's conflict resolution).
//
// asChild -> render adapter (ui-library-system/ui-components SKILL.md RULE
// 1b): retroui's installed Button is Base UI-based and uses `render` (a
// ReactElement Base UI clones its own props onto), not Radix's `asChild`.
// Several real call sites (Herald's envoy topbar, HeraldTopBar, FontPicker,
// LandingPage; Vada's layout/McpDeveloperSection/CalculatorStats/TeamPicker)
// write the Radix `<Button asChild><Link>...</Link></Button>` idiom every
// other library supports. Without this adapter `asChild` leaked straight
// through `...props` onto the native DOM `<button>` element (React console
// warning; the actual render was a `<button>` wrapping an `<a>`, not the
// single `<a>` intended).
function resolveSingleChild(children: ReactNode): ReactElement | undefined {
  if (isValidElement(children)) return children
  return Children.toArray(children).find(isValidElement) as ReactElement | undefined
}

function Button({
  className,
  asChild,
  children,
  render,
  ...props
}: ComponentProps<typeof InstalledButton> & { asChild?: boolean }) {
  const resolvedRender = render ?? (asChild ? resolveSingleChild(children) : undefined)
  return (
    <InstalledButton className={cn(className, 'leading-none')} render={resolvedRender} {...props}>
      {resolvedRender ? undefined : children}
    </InstalledButton>
  )
}

export { Button, buttonVariants }
