import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const attaConfig = defineType({
  name: 'attaConfig',
  title: 'Atta Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('Atta portal')
    })
  ],
  preview: {
    prepare: () => ({ title: 'Atta Config' })
  }
})
