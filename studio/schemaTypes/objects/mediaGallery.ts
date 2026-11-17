import {defineArrayMember, defineField, defineType} from 'sanity'
import {ImagesIcon} from '@sanity/icons'

// Two or three images side by side, always spanning the full page width.
export default defineType({
  name: 'mediaGallery',
  title: 'Image row',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({name: 'alt', title: 'Alt text', type: 'string'}),
            defineField({
              name: 'label',
              title: 'Label above image (optional)',
              type: 'string',
              description: 'A short word above the image, e.g. Before or After.',
              validation: (Rule) => Rule.max(24),
            }),
          ],
        }),
      ],
      options: {layout: 'grid'},
      validation: (Rule) => Rule.min(2).max(3),
    }),
    defineField({
      name: 'arrows',
      title: 'Arrows between images',
      type: 'boolean',
      description: 'Show small arrows between the images, for a sequence such as before and after, or versions in order.',
      initialValue: false,
    }),
    defineField({
      name: 'caption',
      title: 'Caption (optional)',
      type: 'string',
    }),
  ],
  preview: {
    select: {caption: 'caption', images: 'images', media: 'images.0'},
    prepare: ({caption, images, media}) => ({
      title: caption || 'Image row',
      subtitle: `${Array.isArray(images) ? images.length : 0} images side by side`,
      media: media ?? ImagesIcon,
    }),
  },
})
