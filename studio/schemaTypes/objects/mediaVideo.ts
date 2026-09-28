import {defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons'

// A video placed in a project page: either an uploaded file or a link to an
// .mp4/.webm. Short UI recordings usually look best autoplaying on loop.
export default defineType({
  name: 'mediaVideo',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'file',
      title: 'Video file',
      type: 'file',
      options: {accept: 'video/mp4,video/webm,video/quicktime'},
      description: 'Upload an .mp4 or .webm. Keep it short and compressed.',
    }),
    defineField({
      name: 'url',
      title: 'Or video link',
      type: 'url',
      description: 'A direct link to an .mp4 or .webm file, used when no file is uploaded.',
    }),
    defineField({
      name: 'poster',
      title: 'Poster image (optional)',
      type: 'image',
      description: 'Shown while the video loads.',
    }),
    defineField({
      name: 'autoplay',
      title: 'Autoplay on loop',
      type: 'boolean',
      description: 'Plays muted and loops, like a GIF. Turn off to show the player controls instead.',
      initialValue: true,
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
      initialValue: 'full',
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value: {file?: {asset?: unknown}; url?: string} | undefined) =>
      value?.file?.asset || value?.url ? true : 'Upload a video file or paste a video link',
    ),
  preview: {
    select: {caption: 'caption', url: 'url', size: 'size', media: 'poster'},
    prepare: ({caption, url, size, media}) => ({
      title: caption || url || 'Video',
      subtitle: size === 'content' ? 'Video · text column' : 'Video · full width',
      media: media ?? PlayIcon,
    }),
  },
})
