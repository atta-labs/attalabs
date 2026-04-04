/** @category layout */
import type * as React from 'react'

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse'

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: FlexDirection
  align?: FlexAlign
  justify?: FlexJustify
  wrap?: FlexWrap
  gap?: number | string
  as?: React.ElementType
  asChild?: boolean
}
