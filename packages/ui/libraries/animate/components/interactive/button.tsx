import * as React from 'react'
import { cn } from '../../../../lib/utils'
import { Button as ButtonPrimitive, buttonVariants, type ButtonProps } from '../../installed/button'

// leading-none default — see basic/components/interactive/button.tsx for the
// rationale AND the required cn(className, 'leading-none') argument order (a
// caller's text-size class silently wins over a leading-none passed BEFORE
// it in tailwind-merge's conflict resolution). Merged alongside this
// wrapper's existing asChild adaptation (installed/ stays a verbatim
// animate-ui CLI paste).
function Button({ children, asChild = false, className, ...props }: ButtonProps) {
  const mergedClassName = cn(className, 'leading-none', 'cursor-pointer disabled:cursor-not-allowed')

  if (asChild) {
    const child = React.isValidElement(children)
      ? children
      : (React.Children.toArray(children as React.ReactNode).find(React.isValidElement) as
          | React.ReactElement
          | undefined)

    if (child) {
      return (
        <ButtonPrimitive asChild={true} className={mergedClassName} {...props}>
          {child}
        </ButtonPrimitive>
      )
    }
  }

  return (
    <ButtonPrimitive asChild={false} className={mergedClassName} {...props}>
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
