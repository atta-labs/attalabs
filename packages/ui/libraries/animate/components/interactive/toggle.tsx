import { cn } from '../../../../lib/utils'
import {
  Toggle as InstalledToggle,
  toggleVariants,
  type ToggleProps as InstalledToggleProps
} from '../../installed/toggle'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// animate-ui CLI paste) — see basic/components/interactive/toggle.tsx for the
// cursor-pointer rationale.
//
// animate's installed Toggle composes three primitives: an outer motion.button
// (Toggle), an absolutely-positioned highlight, and an inner motion.div
// (ToggleItem) that receives className and the remaining props. The className
// therefore lands on the inner div, which fills the button — cursor-pointer
// still reads correctly on hover. An `aria-label` likewise lands on that inner
// div, and the button's accessible name is computed from its contents, so the
// name still resolves; no adapter is needed for the contract.
function Toggle({ className, ...props }: InstalledToggleProps) {
  return <InstalledToggle className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')} {...props} />
}

// Derived from THIS library's own installed cva — per-library Props rule.
type ToggleProps = InstalledToggleProps

export { Toggle, toggleVariants }
export type { ToggleProps }
