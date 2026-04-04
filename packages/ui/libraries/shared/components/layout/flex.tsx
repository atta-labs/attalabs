import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '../../../../lib/utils'
import type { FlexProps } from '../../../../types/layout/flex'

const directionMap = {
  row: 'flex-row',
  column: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'column-reverse': 'flex-col-reverse'
}
const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline'
}
const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}
const wrapMap = { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' }

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ direction, align, justify, wrap, gap, as, asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : (as ?? 'div')
    return (
      <Comp
        ref={ref}
        className={cn(
          'flex',
          direction && directionMap[direction],
          align && alignMap[align],
          justify && justifyMap[justify],
          wrap && wrapMap[wrap],
          typeof gap === 'number' ? `gap-${gap}` : gap && `gap-[${gap}]`,
          className
        )}
        {...props}
      />
    )
  }
)
Flex.displayName = 'Flex'

export { Flex }
