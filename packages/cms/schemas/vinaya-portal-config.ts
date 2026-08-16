import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const vinayaPortalConfig = defineType({
  name: 'vinayaPortalConfig',
  title: 'Vinaya Portal Config',
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
    prepare: () => ({ title: 'Vinaya Portal Config' })
  }
})
