import {defineField, defineType} from 'sanity'

// One label/value pair in the key details column (Role, Timeline, Skills…).
export default defineType({
  name: 'detailItem',
  title: 'Detail',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'For example Role, Timeline, Team or Skills & Tools.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'value',
      title: 'Value',
      type: 'text',
      rows: 3,
      description: 'Put each item on its own line to list several.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'value'},
  },
})
