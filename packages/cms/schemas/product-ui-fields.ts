import { defineField } from 'sanity'

export function productUserInterfaceFields(_productLabel: string) {
  return [
    defineField({
      name: 'theme',
      title: 'Theme ID',
      type: 'string',
      description: `Active theme ID from Atta project (e.g. "theme-cobalt")`
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
      title: 'Library ID',
      type: 'string',
      description: `Active component library ID from Atta project (e.g. "library-basic")`
    })
  ]
}
