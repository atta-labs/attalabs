import { defineField, defineType } from 'sanity'

import { productUserInterfaceFields } from './product-ui-fields'

export const portfolioConfig = defineType({
  name: 'portfolioConfig',
  title: 'Portfolio Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: productUserInterfaceFields('Portfolio')
    })
  ],
  preview: {
    prepare: () => ({ title: 'Portfolio Config' })
  }
})
