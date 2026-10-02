import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

// One chapter of a case study (Problem Statement, Research, Design Process…).
// Its title appears in the page's side menu and as the small label above the
// heading; the content mixes text, images, videos and image rows.
export default defineType({
  name: 'projectSection',
  title: 'Section',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Section name',
      type: 'string',
      description: 'Short name shown in the side menu and above the heading, e.g. "Research".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Heading (optional)',
      type: 'text',
      rows: 2,
      description: 'The large statement that opens the section.',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      description: 'Write text and add images, videos or a row of images with the + button.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Paragraph', value: 'normal'},
            {title: 'Subheading', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullets', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{name: 'href', type: 'url', title: 'URL'}],
              },
            ],
          },
        }),
        defineArrayMember({type: 'mediaImage'}),
        defineArrayMember({type: 'mediaVideo'}),
        defineArrayMember({type: 'mediaGallery'}),
      ],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'heading'},
  },
})
