import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const vadaConfig = defineType({
  name: 'vadaConfig',
  title: 'Vada Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('Vada portal')
    })
  ],
  preview: {
    prepare: () => ({ title: 'Vada Config' })
  }
})
