import * as React from 'react'
import { cn } from '../../../../lib/utils'
import {
  Button as ButtonPrimitive,
  buttonVariants,
  type ButtonProps as InstalledButtonProps
} from '../../installed/button'

// `xs` is not part of animate-ui's own registry — `installed/button.tsx` stays
// a verbatim CLI paste, so this size is expressed here as a className override
// on top of the installed component's smallest real size ('sm'), matching
// basic's `xs` (h-6/text-xs) sizing intent in animate's own idiom. Additive:
// every existing caller keeps whatever installed size it already passed.
const XS_CLASSES = "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3"

type ButtonProps = Omit<InstalledButtonProps, 'size'> & {
  size?: InstalledButtonProps['size'] | 'xs'
}

// leading-none default — see basic/components/interactive/button.tsx for the
// rationale AND the required cn(className, 'leading-none') argument order (a
// caller's text-size class silently wins over a leading-none passed BEFORE
// it in tailwind-merge's conflict resolution). Merged alongside this
// wrapper's existing asChild adaptation (installed/ stays a verbatim
// animate-ui CLI paste).
function Button({ children, asChild = false, className, size, ...props }: ButtonProps) {
  const isXs = size === 'xs'
  const mergedClassName = cn(
    className,
    'leading-none',
    'cursor-pointer disabled:cursor-not-allowed',
    isXs && XS_CLASSES
  )
  const installedSize = isXs ? 'sm' : size

  if (asChild) {
    const child = React.isValidElement(children)
      ? children
      : (React.Children.toArray(children as React.ReactNode).find(React.isValidElement) as
          | React.ReactElement
          | undefined)

    if (child) {
      return (
        <ButtonPrimitive asChild={true} size={installedSize} className={mergedClassName} {...props}>
          {child}
        </ButtonPrimitive>
      )
    }
  }

  return (
    <ButtonPrimitive asChild={false} size={installedSize} className={mergedClassName} {...props}>
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
