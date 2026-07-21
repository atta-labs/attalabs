import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { Toggle as InstalledToggle, toggleVariants } from '../../installed/toggle'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// retroui Radix-flavor CLI paste) — see
// basic/components/interactive/toggle.tsx for the cursor-pointer rationale.
// retro's installed Button bundles cursor-pointer in its own cva base string,
// but its installed Toggle does NOT, so this wrapper bakes it in (checked the
// installed base classes rather than assuming parity with Button).
function Toggle({ className, ...props }: ComponentProps<typeof InstalledToggle>) {
  return <InstalledToggle className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')} {...props} />
}

// Derived from THIS library's own installed cva — per-library Props rule.
type ToggleProps = ComponentProps<typeof InstalledToggle>

export { Toggle, toggleVariants }
export type { ToggleProps }
