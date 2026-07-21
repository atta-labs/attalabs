import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { Toggle as InstalledToggle, toggleVariants } from '../../installed/toggle'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// shadcn CLI paste) — same universal-default rationale as
// interactive/button.tsx: a Toggle renders a native <button>, which defaults
// to cursor:default in Chrome/Safari, so every toggle would read as
// non-interactive on hover without this. Merged LAST so a caller's own
// cursor-* class still wins tailwind-merge's conflict resolution.
function Toggle({ className, ...props }: ComponentProps<typeof InstalledToggle>) {
  return <InstalledToggle className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')} {...props} />
}

// Derived from THIS library's own installed cva — the per-library Props rule
// (see types/index.ts's note on Button): variant/size enums diverge across
// libraries by design, so there is no shared Toggle props contract.
type ToggleProps = ComponentProps<typeof InstalledToggle>

export { Toggle, toggleVariants }
export type { ToggleProps }
