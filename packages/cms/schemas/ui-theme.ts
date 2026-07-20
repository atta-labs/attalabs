import { createElement } from 'react'
import { defineField, defineType } from 'sanity'
import { CSSValueInput } from '../components/CSSValueInput'

const cssColorField = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    components: {
      input: CSSValueInput
    }
  })

const colorGroup = (
  name: string,
  title: string,
  colors: Array<{ name: string; title: string; description?: string }>,
  group?: string
) =>
  defineField({
    name,
    title,
    type: 'object',
    group,
    options: { collapsible: true, collapsed: false },
    fields: colors.map(({ name, title, description }) => cssColorField(name, title, description))
  })

const COLOR_FIELDS = [
  { name: 'background', title: 'Background' },
  { name: 'foreground', title: 'Foreground' },
  { name: 'card', title: 'Card' },
  { name: 'cardForeground', title: 'Card Foreground' },
  { name: 'popover', title: 'Popover' },
  { name: 'popoverForeground', title: 'Popover Foreground' },
  { name: 'primary', title: 'Primary' },
  { name: 'primaryForeground', title: 'Primary Foreground' },
  { name: 'primaryHover', title: 'Primary Hover' },
  { name: 'secondary', title: 'Secondary' },
  { name: 'secondaryForeground', title: 'Secondary Foreground' },
  { name: 'secondaryHover', title: 'Secondary Hover' },
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
  { name: 'shadowColor', title: 'Shadow Color' },
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
  { name: 'headerBackground', title: 'Header Background', description: 'CSS value (rgba, gradient, etc.)' },
  { name: 'gradientPrimary', title: 'Gradient Primary', description: 'CSS gradient value' },
  { name: 'gradientBackground', title: 'Gradient Background', description: 'CSS gradient value' },
  { name: 'gradientCard', title: 'Gradient Card', description: 'CSS gradient or color value' }
]

export const uiTheme = defineType({
  name: 'uiTheme',
  title: 'UI Theme',
  type: 'document',
  groups: [
    { name: 'light', title: 'Light Mode', default: true },
    { name: 'dark', title: 'Dark Mode' },
    { name: 'typography', title: 'Typography' },
    { name: 'spacing', title: 'Spacing & Radius' },
    { name: 'shadows', title: 'Shadows' },
    { name: 'info', title: 'Info' }
  ],
  fields: [
    // Info
    defineField({
      name: 'name',
      title: 'Theme Name',
      type: 'string',
      description: 'Unique identifier for this theme (e.g., "Midnight Gold", "Cobalt")',
      group: 'info',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Brief description of this theme',
      group: 'info'
    }),

    // Light Mode Colors
    colorGroup('light', 'Light Mode Colors', COLOR_FIELDS, 'light'),

    // Dark Mode Colors
    colorGroup('dark', 'Dark Mode Colors', COLOR_FIELDS, 'dark'),

    // Typography
    defineField({
      name: 'typography',
      title: 'Typography',
      type: 'object',
      group: 'typography',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'fontSans',
          title: 'Sans Font',
          type: 'string',
          description: 'e.g., "Inter, sans-serif"'
        }),
        defineField({
          name: 'fontSerif',
          title: 'Serif Font',
          type: 'string',
          description: 'e.g., "Merriweather, serif"'
        }),
        defineField({
          name: 'fontMono',
          title: 'Mono Font',
          type: 'string',
          description: 'e.g., "JetBrains Mono, monospace"'
        }),
        defineField({
          name: 'trackingNormal',
          title: 'Tracking Normal',
          type: 'string',
          description: 'Letter spacing, e.g., "0em"'
        })
      ]
    }),

    // Spacing & Radius
    defineField({
      name: 'spacing',
      title: 'Spacing & Radius',
      type: 'object',
      group: 'spacing',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'radius',
          title: 'Border Radius',
          type: 'string',
          description: 'Base border radius, e.g., "0.5rem", "1.25rem"'
        }),
        defineField({
          name: 'spacing',
          title: 'Base Spacing',
          type: 'string',
          description: 'Base spacing unit, e.g., "0.25rem"'
        })
      ]
    }),

    // Shadows
    defineField({
      name: 'neobrutalist',
      title: 'Neobrutalist-ready',
      type: 'boolean',
      description:
        'Tick when this theme has been tuned for the retro/brutal libraries: a SOLID border that contrasts with its own surfaces, plus a shadowColor. Those libraries draw a hard border and a hard offset shadow, so a theme with a faint alpha border renders effectively frameless there. The theme pickers use this to only offer compatible themes when a neobrutalist library is selected.',
      initialValue: false,
      group: 'colors'
    }),
    defineField({
      name: 'shadows',
      title: 'Shadows',
      type: 'object',
      group: 'shadows',
      options: { collapsible: true, collapsed: false },
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
      name: 'name',
      lightPrimary: 'light.primary',
      lightBg: 'light.background',
      darkPrimary: 'dark.primary',
      darkBg: 'dark.background'
    },
    prepare({ name, lightPrimary, lightBg, darkPrimary, darkBg }) {
      const hasColors = darkPrimary || darkBg || lightPrimary || lightBg

      return {
        title: name ?? 'Untitled Theme',
        subtitle: [darkBg, darkPrimary].filter(Boolean).join(' / '),
        media: hasColors
          ? () =>
              createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    gap: '2px'
                  }
                },
                createElement(
                  'div',
                  { style: { flex: 1, display: 'flex' } },
                  darkPrimary && createElement('div', { key: 'dp', style: { flex: 1, background: darkPrimary } }),
                  darkBg && createElement('div', { key: 'db', style: { flex: 1, background: darkBg } })
                ),
                createElement(
                  'div',
                  { style: { flex: 1, display: 'flex' } },
                  lightPrimary && createElement('div', { key: 'lp', style: { flex: 1, background: lightPrimary } }),
                  lightBg && createElement('div', { key: 'lb', style: { flex: 1, background: lightBg } })
                )
              )
          : undefined
      }
    }
  }
})
