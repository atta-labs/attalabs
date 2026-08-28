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
      description:
        'Leave empty until this milestone actually ships. This is a RECORD of the real published version, ' +
        "never a target or a prediction — an unshipped milestone's eventual number is not knowable in " +
        'advance (a feature release can consume any minor first). Add it once, at completion, as the exact ' +
        'version @attalabs/vinaya published when this shipped. Free-text, not semver-validated. Empty renders ' +
        'no version stamp on /roadmap and leaves status exactly as set below (no auto-derivation to compare ' +
        'against).'
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
      },
      description:
        '"Dropped" is an editorial call — set it and it always wins. Once Version (above) is set, "Shipping" / ' +
        '"Planned" only matter as a fallback: /roadmap derives that pair live from the published ' +
        '@attalabs/vinaya npm version compared against Version, so this value is never re-checked once a real ' +
        'release makes it stale. While Version is empty, this field is the ONLY source — set it by hand ' +
        '(normally "planned").'
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
