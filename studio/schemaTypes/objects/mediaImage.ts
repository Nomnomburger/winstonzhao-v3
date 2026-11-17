import {defineArrayMember, defineField, defineType} from 'sanity'

// An image placed in a project page. Used for the hero and inside case study
// sections. "Size" decides whether it sits in the text column or spans the
// full page width.
export default defineType({
  name: 'mediaImage',
  title: 'Image',
  type: 'image',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Describe the image for screen readers.',
    }),
    defineField({
      name: 'caption',
      title: 'Caption (optional)',
      type: 'string',
    }),
    defineField({
      name: 'labels',
      title: 'Labels on the image (optional)',
      description:
        'Short words such as Before and After, placed on the image. They use the page’s text colour, so they work in light and dark mode. Positions go from 0 to 1, from the left and from the top.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'imageLabel',
          title: 'Label',
          type: 'object',
          fields: [
            defineField({name: 'text', title: 'Text', type: 'string', validation: (Rule) => Rule.required().max(24)}),
            defineField({
              name: 'x',
              title: 'From the left (0–1)',
              type: 'number',
              initialValue: 0.5,
              validation: (Rule) => Rule.required().min(0).max(1),
            }),
            defineField({
              name: 'y',
              title: 'From the top (0–1)',
              type: 'number',
              initialValue: 0.04,
              validation: (Rule) => Rule.min(0).max(1),
            }),
          ],
          preview: {
            select: {title: 'text', x: 'x'},
            prepare: ({title, x}) => ({
              title,
              subtitle: typeof x === 'number' ? `${Math.round(x * 100)}% from the left` : undefined,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      options: {
        list: [
          {title: 'Text column', value: 'content'},
          {title: 'Full width', value: 'full'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      // The hero is always full width, so the option is hidden there
      hidden: ({document, parent}) =>
        Array.isArray(document?.hero) &&
        document.hero.some((item: {_key?: string}) => item._key === (parent as {_key?: string})?._key),
      initialValue: 'full',
    }),
  ],
  preview: {
    select: {media: 'asset', caption: 'caption', alt: 'alt', size: 'size'},
    prepare: ({media, caption, alt, size}) => ({
      title: caption || alt || 'Image',
      subtitle: size === 'content' ? 'Image · text column' : 'Image · full width',
      media,
    }),
  },
})
