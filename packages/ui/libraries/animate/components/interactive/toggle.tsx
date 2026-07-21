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
// `aria-pressed={undefined}` strips upstream's ARIA state from the inner
// `toggle-item` div. animate-ui's primitive hardcodes `aria-pressed={isPressed}`
// on that div, which is role-less — axe flags it `aria-allowed-attr` [critical],
// since `aria-pressed` is only valid on a `button`/`role=button`. The outer
// `motion.button` already carries the real pressed state from Radix's Root, so
// removing it here loses nothing and leaves exactly one correct announcement
// instead of a state duplicated onto a generic element. The primitive spreads
// `{...props}` AFTER its own `aria-pressed`, which is what makes this override
// work from the wrapper — `installed/` stays a verbatim CLI paste (D-065).
// Spread rather than a literal `aria-pressed={undefined}` attribute: Biome's
// a11y/useValidAriaValues rejects the literal (it only accepts true/false/mixed
// and cannot see that the intent is removal), while the spread expresses the
// same "omit this attribute" override.
const OMIT_ARIA_PRESSED = { 'aria-pressed': undefined } as const

function Toggle({ className, ...props }: InstalledToggleProps) {
  return (
    <InstalledToggle
      className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')}
      {...OMIT_ARIA_PRESSED}
      {...props}
    />
  )
}

// Derived from THIS library's own installed cva — per-library Props rule.
type ToggleProps = InstalledToggleProps

export { Toggle, toggleVariants }
export type { ToggleProps }
