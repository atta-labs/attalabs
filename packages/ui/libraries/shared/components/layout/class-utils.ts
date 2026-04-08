import type { ContainerProps, FlexProps, GridProps, SectionProps } from './types'

/**
 * Tailwind gap class mapping
 * Converts numeric gap values to Tailwind classes
 */
export const getGapClass = (gap: number | undefined): string | undefined => {
  if (gap === undefined) return undefined

  const gapMap: Record<number, string> = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    7: 'gap-7',
    8: 'gap-8',
    9: 'gap-9',
    10: 'gap-10',
    11: 'gap-11',
    12: 'gap-12',
    14: 'gap-14',
    16: 'gap-16',
    20: 'gap-20',
    24: 'gap-24',
    28: 'gap-28',
    32: 'gap-32',
    36: 'gap-36',
    40: 'gap-40',
    44: 'gap-44',
    48: 'gap-48',
    52: 'gap-52',
    56: 'gap-56',
    60: 'gap-60',
    64: 'gap-64',
    72: 'gap-72',
    80: 'gap-80',
    96: 'gap-96'
  }

  return gapMap[gap] || `gap-[${gap * 0.25}rem]`
}

/**
 * Get Tailwind classes for Flex props
 */
export const getFlexClasses = (
  props: Pick<FlexProps, 'direction' | 'align' | 'justify' | 'wrap' | 'gap'>
): string[] => {
  const { direction, align, justify, wrap, gap } = props
  const classes: string[] = ['flex']

  // Direction
  if (direction === 'column') classes.push('flex-col')
  if (direction === 'row-reverse') classes.push('flex-row-reverse')
  if (direction === 'column-reverse') classes.push('flex-col-reverse')

  // Align items
  if (align === 'start') classes.push('items-start')
  if (align === 'center') classes.push('items-center')
  if (align === 'end') classes.push('items-end')
  if (align === 'baseline') classes.push('items-baseline')
  if (align === 'stretch') classes.push('items-stretch')

  // Justify content
  if (justify === 'start') classes.push('justify-start')
  if (justify === 'center') classes.push('justify-center')
  if (justify === 'end') classes.push('justify-end')
  if (justify === 'between') classes.push('justify-between')
  if (justify === 'around') classes.push('justify-around')
  if (justify === 'evenly') classes.push('justify-evenly')

  // Wrap
  if (wrap === 'wrap') classes.push('flex-wrap')
  if (wrap === 'nowrap') classes.push('flex-nowrap')
  if (wrap === 'wrap-reverse') classes.push('flex-wrap-reverse')

  // Gap
  const gapClass = getGapClass(gap)
  if (gapClass) classes.push(gapClass)

  return classes
}

/**
 * Get Tailwind classes for Box props
 */
export const getBoxClasses = (): string[] => {
  return ['box-border']
}

/**
 * Get Tailwind classes for Container props
 */
export const getContainerClasses = (props: Pick<ContainerProps, 'size'>): string[] => {
  const { size = 'lg' } = props
  const classes: string[] = ['container', 'mx-auto', 'px-4']

  const sizeMap: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl'
  }

  if (sizeMap[size]) classes.push(sizeMap[size])

  return classes
}

/**
 * Get Tailwind classes for Grid props
 */
export const getGridClasses = (props: Pick<GridProps, 'columns' | 'rows' | 'gap' | 'flow'>): string[] => {
  const { columns, rows, gap, flow } = props
  const classes: string[] = ['grid']

  // Grid template columns
  const columnsMap: Record<string, string> = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
    '5': 'grid-cols-5',
    '6': 'grid-cols-6',
    '7': 'grid-cols-7',
    '8': 'grid-cols-8',
    '9': 'grid-cols-9',
    '10': 'grid-cols-10',
    '11': 'grid-cols-11',
    '12': 'grid-cols-12'
  }
  if (columns && columnsMap[columns]) classes.push(columnsMap[columns])

  // Grid template rows
  const rowsMap: Record<string, string> = {
    '1': 'grid-rows-1',
    '2': 'grid-rows-2',
    '3': 'grid-rows-3',
    '4': 'grid-rows-4',
    '5': 'grid-rows-5',
    '6': 'grid-rows-6'
  }
  if (rows && rowsMap[rows]) classes.push(rowsMap[rows])

  // Gap
  const gapClass = getGapClass(gap)
  if (gapClass) classes.push(gapClass)

  // Grid auto flow
  const flowMap: Record<string, string> = {
    row: 'grid-flow-row',
    col: 'grid-flow-col',
    dense: 'grid-flow-dense',
    'row-dense': 'grid-flow-row-dense',
    'col-dense': 'grid-flow-col-dense'
  }
  if (flow && flowMap[flow]) classes.push(flowMap[flow])

  return classes
}

/**
 * Get Tailwind classes for Section props
 */
export const getSectionClasses = (props: Pick<SectionProps, 'size'>): string[] => {
  const { size = 'md' } = props
  const classes: string[] = ['w-full']

  const sizeMap: Record<string, string> = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-20'
  }

  if (sizeMap[size]) classes.push(sizeMap[size])

  return classes
}
