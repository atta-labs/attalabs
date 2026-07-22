import * as React from 'react'
import { cn } from '../../../../lib/utils'
import { Switch as InstalledSwitch, type SwitchProps as InstalledSwitchProps } from '../../installed/switch'

// Wrapper (installed/ stays a verbatim animate-ui CLI paste — D-065; never edited).
// Two jobs:
//
// 1. cursor-pointer default. animate is the ONE library whose installed Switch
//    omits it (basic/retro/brutal carry it in their own base strings). Merged
//    LAST so a caller's own cursor-* still wins tailwind-merge.
//
// 2. Work around an upstream animate-ui defect WITHOUT touching installed/.
//    animate-ui's Switch primitive spreads the SAME props object onto BOTH
//    `SwitchPrimitives.Root` AND the inner `motion.button` (verified identical in
//    current upstream). So a caller's Radix-only `onCheckedChange` lands on the
//    DOM <button>, and React logs "Unknown event handler property
//    `onCheckedChange`. It will be ignored." for every controlled animate Switch
//    (e.g. Vinaya's Portal↔Studio ProductSwitch under the animate library).
//    The prop can't be split per-target from a wrapper (same object), and making
//    it non-enumerable dies at the installed layer's own rest-spread. So we never
//    forward `onCheckedChange` down at all: we own the checked state here and
//    translate the switch's own toggle into the caller's callback via a plain DOM
//    `onClick` (valid on <button>, so nothing leaks). `checked` is forwarded so
//    the Radix Root still renders the correct visual/aria state; `onClick` is
//    what actually changes it. Keyboard works because a native <button> turns
//    Space/Enter into a click. Drop this shim if animate-ui separates the two
//    prop sets upstream.
function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  onClick,
  disabled,
  ...props
}: InstalledSwitchProps) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false)
  const isControlled = checked !== undefined
  const value = isControlled ? checked : internal
  // The primitive's double-spread attaches our onClick to the button twice
  // (directly, and again via Root's asChild merge), so a single physical click
  // can invoke it twice — guard on the native event so we toggle exactly once.
  const handledEvent = React.useRef<Event | null>(null)

  return (
    <InstalledSwitch
      className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')}
      checked={value}
      disabled={disabled}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (handledEvent.current === event.nativeEvent) return
        handledEvent.current = event.nativeEvent
        if (disabled) return
        const next = !value
        if (!isControlled) setInternal(next)
        onCheckedChange?.(next)
      }}
      {...props}
    />
  )
}

// Derived from THIS library's own installed component — per-library Props rule.
// animate's adds pressedWidth/startIcon/endIcon/thumbIcon on top of Radix's.
type SwitchProps = InstalledSwitchProps

export { Switch }
export type { SwitchProps }
