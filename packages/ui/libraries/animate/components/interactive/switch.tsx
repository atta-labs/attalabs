import { cn } from '../../../../lib/utils'
import { Switch as InstalledSwitch, type SwitchProps as InstalledSwitchProps } from '../../installed/switch'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// animate-ui CLI paste) — see basic/components/interactive/button.tsx for the
// cursor-pointer rationale.
//
// animate is the ONE library whose installed Switch omits cursor-pointer:
// basic's, retro's and brutal's pastes all carry it in their own base strings,
// animate-ui's does not. Checked per library rather than assumed — the same
// asymmetry Toggle had, in the opposite direction (there it was retro that
// needed it). Merged LAST so a caller's own cursor-* class still wins
// tailwind-merge's conflict resolution.
function Switch({ className, ...props }: InstalledSwitchProps) {
  return <InstalledSwitch className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')} {...props} />
}

// Derived from THIS library's own installed component — per-library Props rule.
// animate's adds pressedWidth/startIcon/endIcon/thumbIcon on top of Radix's.
type SwitchProps = InstalledSwitchProps

export { Switch }
export type { SwitchProps }
