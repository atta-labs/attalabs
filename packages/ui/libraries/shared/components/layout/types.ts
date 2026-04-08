import type React from 'react'

/**
 * Base props shared by all layout primitives
 */
export type BaseLayoutProps = {
  /** Use Radix Slot for composition */
  asChild?: boolean
  /** Render as different element */
  as?: 'div' | 'span'
}

/**
 * Props for Flex layout primitive
 */
export type FlexProps = BaseLayoutProps & {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  gap?: number
} & React.ComponentPropsWithoutRef<'div'>

/**
 * Props for Box layout primitive
 */
export type BoxProps = BaseLayoutProps & React.ComponentPropsWithoutRef<'div'>

/**
 * Props for Container layout primitive
 */
export type ContainerProps = BaseLayoutProps & {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
} & React.ComponentPropsWithoutRef<'div'>

/**
 * Props for Grid layout primitive
 */
export type GridProps = BaseLayoutProps & {
  columns?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
  rows?: '1' | '2' | '3' | '4' | '5' | '6'
  gap?: number
  flow?: 'row' | 'col' | 'dense' | 'row-dense' | 'col-dense'
} & React.ComponentPropsWithoutRef<'div'>

/**
 * Props for Section layout primitive
 */
export type SectionProps = Omit<BaseLayoutProps, 'as'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl'
} & React.ComponentPropsWithoutRef<'section'>
