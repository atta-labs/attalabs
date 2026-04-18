'use client'

import { cn } from '@atta/ui/lib/utils'
import { Checkbox as RetroUICheckbox } from '@atta/ui/basic/installed/checkbox'
import type { ComponentProps } from 'react'

type CheckboxProps = ComponentProps<typeof RetroUICheckbox>

const Checkbox = ({ className, ...props }: CheckboxProps) => (
  <RetroUICheckbox className={cn('border-foreground', className)} {...props} />
)

export { Checkbox }
