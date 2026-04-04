'use client'

import * as React from 'react'
import type { ButtonProps } from '../../../../types/interactive/button'
import { Button as ButtonPrimitive, buttonVariants } from '../../installed/button'

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <ButtonPrimitive ref={ref} {...props} />
))
Button.displayName = 'Button'

export { Button, buttonVariants }
