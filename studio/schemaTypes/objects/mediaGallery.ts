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
          fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
        }),
      ],
      options: {layout: 'grid'},
      validation: (Rule) => Rule.min(2).max(3),
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
