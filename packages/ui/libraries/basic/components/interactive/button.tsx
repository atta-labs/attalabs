import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { Button as InstalledButton, buttonVariants } from '../../installed/button'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// shadcn CLI paste): every button defaults to leading-none. Buttons are
// single-line UI, never paragraph text, so the label's default line-height
// box (taller than a 16px icon) has no reason to exist — without this a
// button pairing an icon with a label looks vertically off even though
// items-center centers the (oversized) label box correctly. No call site
// should ever need to pass this className itself.
//
// leading-none MUST come last in the cn() call. Tailwind v4's text-{size}
// utilities bundle their own default line-height, and tailwind-merge treats
// that bundled line-height as conflicting with an explicit leading-*. Last
// one wins a conflict — cn('leading-none', className) silently loses to any
// caller className containing a text-size class (e.g. text-xs), which is
// every real button. Verified: twMerge('leading-none','text-xs') → 'text-xs'
// (leading-none dropped) vs twMerge('text-xs','leading-none') → both keep.
//
// cursor-pointer: shadcn's canonical omits it because native <button> defaults
// to cursor:default in Chrome/Safari (unlike <a>, which gets pointer from the
// UA stylesheet automatically) — every button in this app should read as
// clickable regardless of variant.
function Button({ className, ...props }: ComponentProps<typeof InstalledButton>) {
  return (
    <InstalledButton
      className={cn(className, 'leading-none', 'cursor-pointer disabled:cursor-not-allowed')}
      {...props}
    />
  )
}

export { Button, buttonVariants }
