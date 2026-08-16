import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const vinayaStudioConfig = defineType({
  name: 'vinayaStudioConfig',
  title: 'Vinaya Studio Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('Vinaya studio')
    })
  ],
  preview: {
    prepare: () => ({ title: 'Vinaya Studio Config' })
  }
})
