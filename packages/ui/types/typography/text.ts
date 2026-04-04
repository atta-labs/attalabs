/** @category typography */
import type * as React from 'react'

export type TextAs = 'p' | 'span' | 'small' | 'strong' | 'em' | 'label'
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextAs
  size?: TextSize
  weight?: TextWeight
  muted?: boolean
}
