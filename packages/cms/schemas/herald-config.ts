import { defineField, defineType } from 'sanity'

export const heraldConfig = defineType({
  name: 'heraldConfig',
  title: 'Herald Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: [
        defineField({
          name: 'theme',
          title: 'Theme',
          type: 'reference',
          to: [{ type: 'uiTheme' }],
          description: 'Active theme for the Herald portal'
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
          description: 'Active component library for the Herald portal'
        })
      ]
    })
  ],
  preview: {
    prepare: () => ({ title: 'Herald Config' })
  }
})
