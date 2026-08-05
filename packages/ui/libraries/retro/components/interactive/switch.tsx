import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { Switch as InstalledSwitch } from '../../installed/switch'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// retroui Radix-flavor CLI paste). retro's installed Switch already bundles
// cursor-pointer in its own base string — checked, rather than assumed from
// Toggle, where retro's paste did NOT and its wrapper had to add it.
//
// The Radix flavor (`https://retroui.dev/r/radix/switch.json`) is deliberate:
// retroui's docs page shows the `base` flavor, which is Base UI and composes
// via `render=` instead of `asChild`. retro standardizes on Radix.
//
// UPSTREAM DEFECT ADAPTED HERE — retroui's *radix* flavor styles its checked
// state on `data-checked:` / `data-unchecked:`, which are **Base UI's**
// attribute names. Radix emits `data-state="checked"` / `"unchecked"` instead,
// so upstream's paste renders a switch whose track never fills and whose thumb
// never slides. Verified against a real production render: the element carries
// `role="switch" aria-checked="true" data-state="checked"` and the page
// contains zero `data-checked=` attributes. Their `base` flavor is presumably
// where those class names came from.
//
// The fix belongs here, not in installed/: re-express upstream's own
// intended rules against the attribute Radix actually emits. The thumb is
// rendered inside installed/, so it is reached with a descendant selector on
// its stable `data-slot` — a wrapper reaching into the primitive it wraps,
// which is the sanctioned place for it, unlike a call site doing the same.
// Values mirror upstream's exactly (translate-x-5 / -x-4 per size, thumb fill
// swapping to bg-background when checked); nothing new is invented.
const RADIX_STATE_FIX = cn(
  'data-[state=checked]:bg-primary',
  '[&_[data-slot=switch-thumb]]:data-[state=unchecked]:translate-x-0',
  '[&_[data-slot=switch-thumb]]:data-[state=checked]:bg-background',
  'data-[size=default]:[&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-5',
  'data-[size=sm]:[&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-4'
)

// Merged BEFORE the caller's className so a consumer can still override any of
// it — this is a defect adapter, not a universal default like Button's
// leading-none (which merges last precisely so it always wins).
function Switch({ className, ...props }: ComponentProps<typeof InstalledSwitch>) {
  return <InstalledSwitch className={cn(RADIX_STATE_FIX, className)} {...props} />
}

// Derived from THIS library's own installed component — per-library Props rule.
// retro's Switch carries a `size` prop ('sm' | 'default') that basic's does not.
type SwitchProps = ComponentProps<typeof InstalledSwitch>

export { Switch }
export type { SwitchProps }
