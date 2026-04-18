'use client'

import type { CheckboxProps } from '@atta/ui/types'
import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from '../../installed/checkbox'

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>((props, ref) => (
  <CheckboxPrimitive ref={ref} {...props} />
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
