import * as React from 'react'
import { Button as ButtonPrimitive, buttonVariants, type ButtonProps } from '../../installed/button'

function Button({ children, asChild = false, ...props }: ButtonProps) {
  if (asChild) {
    const child = React.isValidElement(children)
      ? children
      : (React.Children.toArray(children as React.ReactNode).find(React.isValidElement) as
          | React.ReactElement
          | undefined)

    if (child) {
      return (
        <ButtonPrimitive asChild={true} {...props}>
          {child}
        </ButtonPrimitive>
      )
    }
  }

  return (
    <ButtonPrimitive asChild={false} {...props}>
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
