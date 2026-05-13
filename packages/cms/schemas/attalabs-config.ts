import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const attalabsConfig = defineType({
  name: 'attalabsConfig',
  title: 'AttalLabs Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('AttalLabs portal')
    })
  ],
  preview: {
    prepare: () => ({ title: 'AttalLabs Config' })
  }
})
