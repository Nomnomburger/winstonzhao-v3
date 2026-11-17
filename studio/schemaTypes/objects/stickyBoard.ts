import {defineArrayMember, defineField, defineType} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons'

export const STICKY_COLORS = [
  {title: 'Yellow', value: 'yellow'},
  {title: 'Pink', value: 'pink'},
  {title: 'Blue', value: 'blue'},
  {title: 'Green', value: 'green'},
]

// A board of sticky notes for ideation (brainstorms, plans, early ideas).
// Rendered as real text on the page, so it follows light, dark and colour
// themes: the board has no background, and the label, prompt and highlight
// pill take the page's colours. The notes keep their own pastel colours.
export default defineType({
  name: 'stickyBoard',
  title: 'Sticky notes',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label (optional)',
      type: 'string',
      description: 'Small line above the board, e.g. "The designathon prompt".',
    }),
    defineField({
      name: 'prompt',
      title: 'Prompt (optional)',
      type: 'text',
      rows: 2,
      description: 'The question the notes answer, shown large above them.',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'stickyNote',
          title: 'Note',
          type: 'object',
          fields: [
            defineField({name: 'text', title: 'Text', type: 'text', rows: 2, validation: (Rule) => Rule.required()}),
            defineField({
              name: 'color',
              title: 'Colour',
              type: 'string',
              options: {list: STICKY_COLORS, layout: 'radio', direction: 'horizontal'},
              initialValue: 'yellow',
            }),
            defineField({
              name: 'tag',
              title: 'Tag (optional)',
              type: 'string',
              description: 'Small label inside the note, e.g. "Shipped in v1.0".',
            }),
            defineField({
              name: 'highlight',
              title: 'Highlight (optional)',
              type: 'string',
              description: 'Marks the note as the chosen one: it shows in gold with this word on a pill, e.g. "Picked".',
              validation: (Rule) => Rule.max(16),
            }),
          ],
          preview: {select: {title: 'text', subtitle: 'tag'}},
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'caption',
      title: 'Caption (optional)',
      type: 'string',
    }),
  ],
  preview: {
    select: {label: 'label', prompt: 'prompt', notes: 'notes'},
    prepare: ({label, prompt, notes}) => ({
      title: prompt || label || 'Sticky notes',
      subtitle: `${Array.isArray(notes) ? notes.length : 0} notes`,
    }),
  },
})
