import { cn } from '../../../../lib/utils'
import type { ChromeFrameProps } from '../../../../types'

// Flush chrome frame — the default for basic (and re-exported by animate/brutal).
// Renders the chrome edge-to-edge with no float: a full-width topbar bar with a
// bottom rule, or a full-height rail with a right rule + sidebar surface. retro
// overrides this with a floating Card frame; because the float lives ONLY in
// retro's ChromeFrame, non-retro products keep their flush chrome unchanged.
//
// Hand-written in the wrapper layer (no upstream canonical), same as `Code` —
// nothing to paste into `installed/`.
//
// `className` carries the shared inner layout (the topbar's `relative`/nav
// positioning, a rail's scroll box) and is applied to the surface element.
export function ChromeFrame({ variant, className, children, ...props }: ChromeFrameProps) {
  if (variant === 'rail') {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden border-sidebar-border border-r bg-sidebar',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
  if (variant === 'panel') {
    return (
      <div className={cn('flex h-full w-full flex-col overflow-y-auto bg-card', className)} {...props}>
        {children}
      </div>
    )
  }
  if (variant === 'bar') {
    return (
      <div className={cn('flex w-full items-center border-border border-b bg-card', className)} {...props}>
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn(
        // `data-bare` is an ANCESTOR attribute (the landing hero's own chrome host writes
        // it, never this component) — see TOPBAR-LOCKUP.md. Border and background are the
        // only two properties bare state touches; every other consumer of this variant
        // never sets the attribute at all, so this rule is dormant everywhere else.
        'relative flex h-14 w-full items-center border-border border-b bg-background px-6 [[data-bare=true]_&]:border-transparent [[data-bare=true]_&]:bg-transparent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
