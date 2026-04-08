import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const vitakkaConfig = defineType({
  name: 'vitakkaConfig',
  title: 'Vitakka Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('Vitakka portal')
    })
  ],
  preview: {
    prepare: () => ({ title: 'Vitakka Config' })
  }
})
