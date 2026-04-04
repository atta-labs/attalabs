import { createElement } from 'react'
import { defineField, defineType } from 'sanity'
import { LibraryPreview } from './library-preview'

export const library = defineType({
  name: 'library',
  title: 'Component Library',
  type: 'document',
  fields: [
    defineField({
      name: 'id',
      title: 'ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Unique identifier: basic, retro, animate, brutal'
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Display name (e.g., "Standard", "Retro")'
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Short style description'
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      description: 'Style category (e.g., "Modern / Minimal")'
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Display ordering'
    })
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }]
    }
  ],
  preview: {
    select: {
      title: 'name',
      libraryId: 'id',
      style: 'style'
    },
    prepare({ title, libraryId, style }) {
      return {
        title: title || 'Unnamed Library',
        subtitle: [libraryId, style].filter(Boolean).join(' · '),
        media: () => createElement(LibraryPreview, { libraryId })
      }
    }
  }
})
