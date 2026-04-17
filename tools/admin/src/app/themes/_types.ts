import type { ThemeSpacing, ThemeTypography } from '@atta/cms'

export type ThemeColors = Record<string, string>

export interface ThemeEditorData {
  name: string
  description?: string
  light?: ThemeColors
  dark?: ThemeColors
  typography?: ThemeTypography
  spacing?: ThemeSpacing
  shadows?: Record<string, string>
}

export const COLOR_FIELD_NAMES = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'popover',
  'popoverForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'muted',
  'mutedForeground',
  'accent',
  'accentForeground',
  'destructive',
  'destructiveForeground',
  'success',
  'successForeground',
  'warning',
  'warningForeground',
  'border',
  'input',
  'ring',
  'chart1',
  'chart2',
  'chart3',
  'chart4',
  'chart5',
  'sidebar',
  'sidebarForeground',
  'sidebarPrimary',
  'sidebarPrimaryForeground',
  'sidebarAccent',
  'sidebarAccentForeground',
  'sidebarBorder',
  'sidebarRing',
  'headerBackground',
  'gradientPrimary',
  'gradientBackground',
  'gradientCard'
] as const

export type ColorFieldName = (typeof COLOR_FIELD_NAMES)[number]

export const COLOR_GROUPS: Array<{ title: string; fields: ColorFieldName[] }> = [
  {
    title: 'Base',
    fields: ['background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground']
  },
  {
    title: 'Brand',
    fields: [
      'primary',
      'primaryForeground',
      'secondary',
      'secondaryForeground',
      'accent',
      'accentForeground',
      'muted',
      'mutedForeground'
    ]
  },
  {
    title: 'Status',
    fields: ['destructive', 'destructiveForeground', 'success', 'successForeground', 'warning', 'warningForeground']
  },
  {
    title: 'UI',
    fields: ['border', 'input', 'ring']
  },
  {
    title: 'Charts',
    fields: ['chart1', 'chart2', 'chart3', 'chart4', 'chart5']
  },
  {
    title: 'Sidebar',
    fields: [
      'sidebar',
      'sidebarForeground',
      'sidebarPrimary',
      'sidebarPrimaryForeground',
      'sidebarAccent',
      'sidebarAccentForeground',
      'sidebarBorder',
      'sidebarRing'
    ]
  },
  {
    title: 'Gradients',
    fields: ['headerBackground', 'gradientPrimary', 'gradientBackground', 'gradientCard']
  }
]

export const SHADOW_FIELDS = [
  'shadow2xs',
  'shadowXs',
  'shadowSm',
  'shadow',
  'shadowMd',
  'shadowLg',
  'shadowXl',
  'shadow2xl'
] as const
