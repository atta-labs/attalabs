import { defineField, defineType } from 'sanity'

const faviconSetFields = [
  defineField({
    name: 'ico',
    title: 'favicon.ico',
    type: 'file',
    options: { accept: '.ico' },
    description: 'Multi-size legacy (16 + 32 + 48 px)'
  }),
  defineField({ name: 'png16', title: 'favicon-16×16.png', type: 'image', description: 'Browser tab — small' }),
  defineField({ name: 'png32', title: 'favicon-32×32.png', type: 'image', description: 'Browser tab — standard' }),
  defineField({ name: 'png48', title: 'favicon-48×48.png', type: 'image', description: 'Browser tab — medium' }),
  defineField({ name: 'png64', title: 'favicon-64×64.png', type: 'image', description: 'Browser tab — high-DPI' }),
  defineField({ name: 'png128', title: 'favicon-128×128.png', type: 'image', description: 'Chrome Web Store' }),
  defineField({ name: 'png180', title: 'favicon-180×180.png', type: 'image', description: '180 px general' }),
  defineField({ name: 'png192', title: 'favicon-192×192.png', type: 'image', description: '192 px general' }),
  defineField({ name: 'png512', title: 'favicon-512×512.png', type: 'image', description: '512 px general' }),
  defineField({
    name: 'appleTouchIcon',
    title: 'apple-touch-icon.png',
    type: 'image',
    description: 'iOS home screen (180×180)'
  }),
  defineField({
    name: 'appIcon180',
    title: 'app-icon-180×180.png',
    type: 'image',
    description: 'App icon (180×180)'
  }),
  defineField({
    name: 'appIcon192',
    title: 'app-icon-192×192.png',
    type: 'image',
    description: 'Android / PWA (192×192)'
  }),
  defineField({
    name: 'appIcon512',
    title: 'app-icon-512×512.png',
    type: 'image',
    description: 'PWA splash screen (512×512)'
  })
]

export const branding = defineType({
  name: 'branding',
  title: 'Branding',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'shape', title: 'Logo Shape' },
    { name: 'variants', title: 'Variants' },
    { name: 'usage', title: 'Usage Rules' },
    { name: 'logos', title: 'Logo Assets' },
    { name: 'favicons', title: 'Favicon Set' }
  ],
  fields: [
    // ── Identity ──────────────────────────────────────────────────
    defineField({
      name: 'productId',
      title: 'Product ID',
      type: 'string',
      group: 'identity',
      readOnly: true,
      validation: (Rule) => Rule.required(),
      options: {
        list: ['herald', 'atta', 'vada', 'vitakka'].map((id) => ({ title: id, value: id }))
      },
      description: 'Read-only. Set once on document creation.'
    }),
    defineField({
      name: 'productName',
      title: 'Product Name',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'paliRoot',
      title: 'Pali Root',
      type: 'string',
      group: 'identity',
      description: 'e.g. "Attā (अत्ता)"'
    }),
    defineField({
      name: 'paliMeaning',
      title: 'Pali Meaning',
      type: 'string',
      group: 'identity',
      description: 'e.g. "self"'
    }),
    defineField({
      name: 'tagline',
      title: 'One-line Description',
      type: 'string',
      group: 'identity',
      description: 'What the product is in one sentence'
    }),

    // ── Logo Shape ────────────────────────────────────────────────
    defineField({
      name: 'bladeDirection',
      title: 'Blade Direction',
      type: 'string',
      group: 'shape',
      options: {
        list: [
          { title: 'Λ — apex up', value: 'apex-up' },
          { title: 'V — apex down', value: 'apex-down' }
        ]
      }
    }),
    defineField({
      name: 'interiorElement',
      title: 'Interior Element',
      type: 'string',
      group: 'shape',
      description: 'e.g. "Eye — almond ellipse with pupil"'
    }),
    defineField({
      name: 'interiorMeaning',
      title: 'Interior Meaning',
      type: 'string',
      group: 'shape',
      description: 'What the interior element represents'
    }),
    defineField({
      name: 'shapeNotes',
      title: 'Shape Notes',
      type: 'text',
      rows: 4,
      group: 'shape',
      description: 'Key constraints — e.g. blade curves are intentional and must not be straightened'
    }),

    // ── Variants ──────────────────────────────────────────────────
    defineField({
      name: 'outlineDescription',
      title: 'Outline Variant — Description',
      type: 'text',
      rows: 4,
      group: 'variants',
      description: 'What the outline variant is and how it is rendered'
    }),
    defineField({
      name: 'outlineUseCases',
      title: 'Outline Variant — Use Cases',
      type: 'text',
      rows: 3,
      group: 'variants'
    }),
    defineField({
      name: 'outlineMinSizePx',
      title: 'Outline Minimum Size (px)',
      type: 'number',
      group: 'variants',
      initialValue: 48
    }),
    defineField({
      name: 'solidDescription',
      title: 'Solid Variant — Description',
      type: 'text',
      rows: 4,
      group: 'variants',
      description: 'What the solid variant is and how it is rendered'
    }),
    defineField({
      name: 'solidUseCases',
      title: 'Solid Variant — Use Cases',
      type: 'text',
      rows: 3,
      group: 'variants'
    }),
    defineField({
      name: 'solidMinSizePx',
      title: 'Solid Minimum Size (px)',
      type: 'number',
      group: 'variants',
      initialValue: 16
    }),

    // ── Usage Rules ───────────────────────────────────────────────
    defineField({
      name: 'clearSpace',
      title: 'Clear Space Rule',
      type: 'string',
      group: 'usage',
      description: 'e.g. "Equal to the height of the interior element on all sides"'
    }),
    defineField({
      name: 'forbidden',
      title: 'Forbidden Uses',
      type: 'array',
      group: 'usage',
      of: [{ type: 'string' }],
      description: 'List of things not to do with the logo'
    }),

    // ── Logo SVG Assets ───────────────────────────────────────────
    // file type, not image — preserves SVG masters without server-side transforms
    defineField({
      name: 'logoOutlineLight',
      title: 'Logo — Outline, Light',
      type: 'file',
      group: 'logos',
      options: { accept: '.svg,image/svg+xml' }
    }),
    defineField({
      name: 'logoOutlineDark',
      title: 'Logo — Outline, Dark',
      type: 'file',
      group: 'logos',
      options: { accept: '.svg,image/svg+xml' }
    }),
    defineField({
      name: 'logoSolidLight',
      title: 'Logo — Solid, Light',
      type: 'file',
      group: 'logos',
      options: { accept: '.svg,image/svg+xml' }
    }),
    defineField({
      name: 'logoSolidDark',
      title: 'Logo — Solid, Dark',
      type: 'file',
      group: 'logos',
      options: { accept: '.svg,image/svg+xml' }
    }),

    // ── Favicon Sets ──────────────────────────────────────────────
    defineField({
      name: 'faviconLight',
      title: 'Favicon Set — Light',
      type: 'object',
      group: 'favicons',
      fields: faviconSetFields
    }),
    defineField({
      name: 'faviconDark',
      title: 'Favicon Set — Dark',
      type: 'object',
      group: 'favicons',
      fields: faviconSetFields
    })
  ],

  preview: {
    select: {
      productId: 'productId',
      productName: 'productName'
    },
    prepare({ productId, productName }) {
      return {
        title: productName ?? productId ?? 'Unnamed Branding',
        subtitle: productId
      }
    }
  }
})
