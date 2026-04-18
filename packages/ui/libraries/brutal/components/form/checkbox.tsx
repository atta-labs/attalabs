'use client'

import { Checkbox as BrutalCheckbox } from '@atta/ui/brutal/installed/checkbox'
import type { CheckboxProps } from '@atta/ui/types'
import * as React from 'react'

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>((props, ref) => (
  <BrutalCheckbox ref={ref} {...props} />
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
