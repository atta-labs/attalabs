import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const vinayaConfig = defineType({
  name: 'vinayaConfig',
  title: 'Vinaya Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('Vinaya portal')
    })
  ],
  preview: {
    prepare: () => ({ title: 'Vinaya Config' })
  }
})
