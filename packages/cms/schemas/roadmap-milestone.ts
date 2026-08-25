import { defineField, defineType } from 'sanity'

export const roadmapMilestone = defineType({
  name: 'roadmapMilestone',
  title: 'Roadmap Milestone',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'The release version this item targets, e.g. "0.20.0" — free-text, not semver-validated.'
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
      description: 'The long-form body — what this item is and why it exists.'
    }),
    defineField({
      name: 'truth',
      title: "What's True Today",
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required(),
      description: 'One or two sentences on what is actually shipped today, distinct from the longer description.'
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          { title: 'Shipping', value: 'shipping' },
          { title: 'Planned', value: 'planned' },
          { title: 'Dropped', value: 'dropped' }
        ]
      }
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true }
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      validation: (Rule) => Rule.required(),
      description: 'Manual ordering — there is no date field to sort by.'
    })
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'version',
      media: 'image'
    }
  }
})
