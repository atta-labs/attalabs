import { defineField } from 'sanity'

export function productUserInterfaceFields(productLabel: string) {
  return [
    defineField({
      name: 'theme',
      title: 'Theme',
      type: 'reference',
      to: [{ type: 'uiTheme' }],
      description: `Active theme for the ${productLabel}`
    }),
    defineField({
      name: 'colorScheme',
      title: 'Color Scheme',
      type: 'string',
      options: {
        list: [
          { title: 'Dark', value: 'dark' },
          { title: 'Light', value: 'light' }
        ]
      },
      initialValue: 'dark'
    }),
    defineField({
      name: 'library',
      title: 'Library',
      type: 'reference',
      to: [{ type: 'library' }],
      description: `Active component library for the ${productLabel}`
    })
  ]
}
