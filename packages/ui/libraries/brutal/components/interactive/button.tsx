import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { Button as InstalledButton, buttonVariants as installedButtonVariants } from '../../installed/button'

type InstalledVariant = NonNullable<ComponentProps<typeof InstalledButton>['variant']>
type InstalledSize = NonNullable<ComponentProps<typeof InstalledButton>['size']>

// `outline`/`ghost`/`link`/`secondary` (variant) and `xs`/`icon-sm` (size) are
// not part of brutal's own installed registry (a verbatim neobrutalism.dev CLI
// paste, never hand-edited — see installed/button.tsx). Every real app already
// uses them pervasively against basic/retro/animate, so each is expressed here
// as a className override on top of the closest installed base — same pattern
// as animate's `xs` fix (animate/components/interactive/button.tsx).
//
// Design intent, in brutal's own idiom (not a reskin of another library):
// - `secondary` maps onto `neutral` with NO override — `neutral`
//   (bg-secondary-background) already IS brutal's secondary surface.
// - `outline` maps onto `default`, dropping only the fill (bg-transparent,
//   text-foreground) — it keeps the border, the shadow, and the
//   hover-translate-away motion, because brutal has no lesser-decorated
//   "bordered but flat" state and every other variant already owns that
//   shadow behavior. (retro's own outline — border-2 bg-transparent shadow-md
//   hover:translate-y-1 — confirms this reads as the right amount of
//   emphasis for a neobrutalist outline, without copying its classes.)
// - `ghost` maps onto `noShadow`, dropping the border AND the fill — brutal's
//   first genuinely low-decoration variant, deliberately, since every other
//   library's `ghost` is minimal too and brutal needs *a* least-emphasis slot.
// - `link` maps onto `noShadow`, dropping the border and fill entirely and
//   reading as underlined text, matching every other library's `link`.
type ExtraVariant = 'outline' | 'ghost' | 'link' | 'secondary'
type ExtraSize = 'xs' | 'icon-sm'

const VARIANT_BASE: Record<ExtraVariant, InstalledVariant> = {
  secondary: 'neutral',
  outline: 'default',
  ghost: 'noShadow',
  link: 'noShadow'
}

const VARIANT_CLASSES: Record<ExtraVariant, string> = {
  secondary: '',
  outline: 'bg-transparent text-foreground',
  ghost: 'border-transparent bg-transparent text-foreground hover:bg-secondary-background',
  link: 'border-transparent bg-transparent text-foreground underline-offset-4 hover:underline'
}

const SIZE_BASE: Record<ExtraSize, InstalledSize> = {
  xs: 'sm',
  'icon-sm': 'icon'
}

const SIZE_CLASSES: Record<ExtraSize, string> = {
  // No `rounded-*` override — the base class already sets `rounded-base`;
  // repeating a Tailwind radius utility here would win the tailwind-merge
  // conflict and silently swap brutal's own radius token for a generic one.
  xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  'icon-sm': 'size-8'
}

type ButtonProps = Omit<ComponentProps<typeof InstalledButton>, 'variant' | 'size'> & {
  variant?: InstalledVariant | ExtraVariant
  size?: InstalledSize | ExtraSize
}

function isExtraVariant(variant: ButtonProps['variant']): variant is ExtraVariant {
  return variant !== undefined && variant in VARIANT_BASE
}

function isExtraSize(size: ButtonProps['size']): size is ExtraSize {
  return size !== undefined && size in SIZE_BASE
}

// Real app code calls `buttonVariants()` directly (not through <Button>) to
// style a plain <Link> as a button — e.g. vinaya-portal's ButtonLink.tsx,
// which passes variant='secondary'/'outline'. Re-exporting installed's raw
// cva unchanged (as this wrapper did before) leaves that call site with only
// the original default/noShadow/neutral/reverse enum, since a className
// override on <Button> can't reach a consumer that never renders <Button>.
// This widened function is the same variant/size mapping as <Button> above,
// exposed as a standalone class-string function — additive: every existing
// caller passing an installed variant/size gets byte-identical output.
type ButtonVariantsArgs = {
  variant?: InstalledVariant | ExtraVariant
  size?: InstalledSize | ExtraSize
  className?: string
}

function buttonVariants({ variant, size, className }: ButtonVariantsArgs = {}): string {
  const extraVariant = isExtraVariant(variant) ? variant : undefined
  const extraSize = isExtraSize(size) ? size : undefined

  return cn(
    installedButtonVariants({
      variant: extraVariant ? VARIANT_BASE[extraVariant] : (variant as InstalledVariant | undefined),
      size: extraSize ? SIZE_BASE[extraSize] : (size as InstalledSize | undefined)
    }),
    className,
    extraVariant && VARIANT_CLASSES[extraVariant],
    extraSize && SIZE_CLASSES[extraSize]
  )
}

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// neobrutalism CLI paste) — see basic/components/interactive/button.tsx for
// the leading-none rationale AND the required cn(className, 'leading-none')
// argument order (a caller's text-size class silently wins over a
// leading-none passed BEFORE it in tailwind-merge's conflict resolution).
// The extra-variant/extra-size overrides must come after that for the same
// reason: last conflicting utility in the string wins the tailwind-merge.
function Button({ className, variant, size, ...props }: ButtonProps) {
  const extraVariant = isExtraVariant(variant) ? variant : undefined
  const extraSize = isExtraSize(size) ? size : undefined

  return (
    <InstalledButton
      variant={extraVariant ? VARIANT_BASE[extraVariant] : (variant as InstalledVariant | undefined)}
      size={extraSize ? SIZE_BASE[extraSize] : (size as InstalledSize | undefined)}
      className={cn(
        className,
        'leading-none',
        'cursor-pointer disabled:cursor-not-allowed',
        extraVariant && VARIANT_CLASSES[extraVariant],
        extraSize && SIZE_CLASSES[extraSize]
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
