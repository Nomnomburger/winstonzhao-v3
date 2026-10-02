import {defineField, defineType} from 'sanity'

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
