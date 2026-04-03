import { defineField, defineType } from 'sanity'

const cssColorField = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description
  })

const colorGroup = (
  name: string,
  title: string,
  colors: Array<{ name: string; title: string; description?: string }>
) =>
  defineField({
    name,
    title,
    type: 'object',
    options: { collapsible: true, collapsed: false },
    fields: colors.map(({ name, title, description }) => cssColorField(name, title, description))
  })

const BASE_COLORS = [
  { name: 'background', title: 'Background' },
  { name: 'foreground', title: 'Foreground' },
  { name: 'card', title: 'Card' },
  { name: 'cardForeground', title: 'Card Foreground' },
  { name: 'popover', title: 'Popover' },
  { name: 'popoverForeground', title: 'Popover Foreground' },
  { name: 'primary', title: 'Primary' },
  { name: 'primaryForeground', title: 'Primary Foreground' },
  { name: 'secondary', title: 'Secondary' },
  { name: 'secondaryForeground', title: 'Secondary Foreground' },
  { name: 'muted', title: 'Muted' },
  { name: 'mutedForeground', title: 'Muted Foreground' },
  { name: 'accent', title: 'Accent' },
  { name: 'accentForeground', title: 'Accent Foreground' },
  { name: 'destructive', title: 'Destructive' },
  { name: 'destructiveForeground', title: 'Destructive Foreground' },
  { name: 'success', title: 'Success' },
  { name: 'successForeground', title: 'Success Foreground' },
  { name: 'warning', title: 'Warning' },
  { name: 'warningForeground', title: 'Warning Foreground' },
  { name: 'border', title: 'Border' },
  { name: 'input', title: 'Input' },
  { name: 'ring', title: 'Ring' },
  { name: 'chart1', title: 'Chart 1' },
  { name: 'chart2', title: 'Chart 2' },
  { name: 'chart3', title: 'Chart 3' },
  { name: 'chart4', title: 'Chart 4' },
  { name: 'chart5', title: 'Chart 5' },
  { name: 'sidebar', title: 'Sidebar' },
  { name: 'sidebarForeground', title: 'Sidebar Foreground' },
  { name: 'sidebarPrimary', title: 'Sidebar Primary' },
  { name: 'sidebarPrimaryForeground', title: 'Sidebar Primary Foreground' },
  { name: 'sidebarAccent', title: 'Sidebar Accent' },
  { name: 'sidebarAccentForeground', title: 'Sidebar Accent Foreground' },
  { name: 'sidebarBorder', title: 'Sidebar Border' },
  { name: 'sidebarRing', title: 'Sidebar Ring' },
  { name: 'headerBackground', title: 'Header Background' },
  { name: 'gradientPrimary', title: 'Gradient Primary' },
  { name: 'gradientBackground', title: 'Gradient Background' },
  { name: 'gradientCard', title: 'Gradient Card' }
]

export const uiTheme = defineType({
  name: 'uiTheme',
  title: 'UI Theme',
  type: 'document',
  groups: [
    { name: 'light', title: 'Light', default: true },
    { name: 'dark', title: 'Dark' },
    { name: 'typography', title: 'Typography' },
    { name: 'spacing', title: 'Spacing' },
    { name: 'shadows', title: 'Shadows' }
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Theme Name',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2
    }),
    colorGroup('light', 'Light Mode Colors', BASE_COLORS),
    colorGroup('dark', 'Dark Mode Colors', BASE_COLORS),
    defineField({
      name: 'typography',
      title: 'Typography',
      type: 'object',
      group: 'typography',
      fields: [
        defineField({ name: 'fontSans', title: 'Font Sans', type: 'string' }),
        defineField({ name: 'fontSerif', title: 'Font Serif', type: 'string' }),
        defineField({ name: 'fontMono', title: 'Font Mono', type: 'string' }),
        defineField({ name: 'trackingNormal', title: 'Tracking Normal', type: 'string' })
      ]
    }),
    defineField({
      name: 'spacing',
      title: 'Spacing',
      type: 'object',
      group: 'spacing',
      fields: [
        defineField({ name: 'radius', title: 'Border Radius', type: 'string' }),
        defineField({ name: 'spacing', title: 'Spacing', type: 'string' })
      ]
    }),
    defineField({
      name: 'shadows',
      title: 'Shadows',
      type: 'object',
      group: 'shadows',
      fields: [
        defineField({ name: 'shadow2xs', title: 'Shadow 2XS', type: 'string' }),
        defineField({ name: 'shadowXs', title: 'Shadow XS', type: 'string' }),
        defineField({ name: 'shadowSm', title: 'Shadow SM', type: 'string' }),
        defineField({ name: 'shadow', title: 'Shadow', type: 'string' }),
        defineField({ name: 'shadowMd', title: 'Shadow MD', type: 'string' }),
        defineField({ name: 'shadowLg', title: 'Shadow LG', type: 'string' }),
        defineField({ name: 'shadowXl', title: 'Shadow XL', type: 'string' }),
        defineField({ name: 'shadow2xl', title: 'Shadow 2XL', type: 'string' })
      ]
    })
  ],
  preview: {
    select: {
      title: 'name',
      darkBg: 'dark.background',
      darkPrimary: 'dark.primary'
    },
    prepare({ title, darkBg, darkPrimary }) {
      return {
        title: title ?? 'Untitled Theme',
        subtitle: [darkBg, darkPrimary].filter(Boolean).join(' / ')
      }
    }
  }
})
