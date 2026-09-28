import {defineArrayMember, defineField, defineType} from 'sanity'
import {CaseIcon, StarFilledIcon} from '@sanity/icons'

// Every project page uses the same template. Fields are grouped into tabs in
// the order they appear on the site, and every section of the page is
// optional: leave a field empty and that part of the page is simply skipped,
// so a quick visual project and a long case study can share one template.
export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  icon: CaseIcon,
  groups: [
    {name: 'listing', title: '1. Home page', default: true},
    {name: 'header', title: '2. Page header'},
    {name: 'details', title: '3. Summary & details'},
    {name: 'body', title: '4. Case study'},
  ],
  fields: [
    // 1. Home page -----------------------------------------------------------
    defineField({
      name: 'title',
      title: 'Project title',
      type: 'string',
      group: ['listing', 'header'],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Page address',
      type: 'slug',
      group: 'listing',
      description: 'The end of the page URL, e.g. winston.studio/projects/heatmap-redesign. Click Generate.',
      options: {
        source: 'title',
        slugify: (input: string) =>
          input
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 96),
      },
      validation: (Rule) =>
        Rule.required().custom((value) =>
          !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current)
            ? true
            : 'Use lowercase letters, numbers and dashes only (no spaces)',
        ),
    }),
    defineField({
      name: 'featured',
      title: 'Featured on home page',
      type: 'boolean',
      group: 'listing',
      description:
        'On: shown with a large photo at the top of the home page. Off: shown in the project list below, where hovering reveals the thumbnail.',
      initialValue: false,
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: ['listing', 'header'],
      validation: (Rule) => Rule.required().min(1990).max(2100),
    }),
    defineField({
      name: 'coverImage',
      title: 'Thumbnail',
      type: 'image',
      group: 'listing',
      description:
        'The featured photo on the home page, and the image that follows the cursor in the project list. Landscape works best.',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: 'listing',
      description: 'One line shown next to the project in the home page list, and in search results.',
      validation: (Rule) => Rule.required().max(160).warning('Keep it to one short line'),
    }),
    defineField({
      name: 'order',
      title: 'Sort order (optional)',
      type: 'number',
      group: 'listing',
      description: 'Lower numbers show first. Projects without a number follow, newest year first.',
    }),
    defineField({
      name: 'tags',
      title: 'Tags (optional)',
      type: 'array',
      group: 'listing',
      of: [
        defineArrayMember({
          type: 'string',
          options: {
            list: [
              {title: 'UI/UX', value: 'uiux'},
              {title: 'Branding', value: 'branding'},
              {title: 'Case Study', value: 'case-study'},
              {title: 'Awards', value: 'awards'},
            ],
          },
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),

    // 2. Page header ---------------------------------------------------------
    defineField({
      name: 'client',
      title: 'Client or context',
      type: 'string',
      group: 'header',
      description: 'Shown under the title, e.g. "Full Sprint — Heatmap.com" or "Personal project".',
    }),
    defineField({
      name: 'discipline',
      title: 'Discipline',
      type: 'string',
      group: 'header',
      description: 'e.g. UI/UX, Branding, Industrial Design.',
    }),
    defineField({
      name: 'link',
      title: 'External link (optional)',
      type: 'object',
      group: 'header',
      description: 'A live site or prototype, shown as "Visit ↗".',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({name: 'url', title: 'URL', type: 'url'}),
        defineField({
          name: 'label',
          title: 'Link text',
          type: 'string',
          initialValue: 'Visit',
        }),
      ],
    }),
    defineField({
      name: 'intro',
      title: 'Intro paragraph',
      type: 'text',
      rows: 4,
      group: 'header',
      description: 'The short paragraph in the top right of the page.',
    }),
    defineField({
      name: 'hero',
      title: 'Hero image or video',
      type: 'array',
      group: 'header',
      description: 'The large image or video under the title. Add one.',
      of: [defineArrayMember({type: 'mediaImage'}), defineArrayMember({type: 'mediaVideo'})],
      validation: (Rule) => Rule.max(1),
    }),

    // 3. Summary & details ---------------------------------------------------
    defineField({
      name: 'summary',
      title: 'Summary statement',
      type: 'text',
      rows: 3,
      group: 'details',
      description: 'The large sentence under the hero that sums up the project.',
    }),
    defineField({
      name: 'details',
      title: 'Key details',
      type: 'array',
      group: 'details',
      description: 'The label/value list beside the summary. Add, remove or reorder freely.',
      of: [defineArrayMember({type: 'detailItem'})],
      initialValue: [
        {_type: 'detailItem', label: 'Role', value: ''},
        {_type: 'detailItem', label: 'Timeline', value: ''},
        {_type: 'detailItem', label: 'Skills & Tools', value: ''},
      ],
    }),
    defineField({
      name: 'overview',
      title: 'Overview',
      type: 'text',
      rows: 6,
      group: 'details',
      description: 'A paragraph of context, shown in the left column.',
    }),
    defineField({
      name: 'impact',
      title: 'Impact',
      type: 'text',
      rows: 3,
      group: 'details',
      description: 'The outcome in one or two sentences, shown large in the right column.',
    }),

    // 4. Case study ----------------------------------------------------------
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'body',
      description:
        'The chapters of the case study. Each section name is listed in the side menu. Sections can hold text, images, videos and image rows.',
      of: [defineArrayMember({type: 'projectSection'})],
    }),
    defineField({
      name: 'showSideMenu',
      title: 'Show side menu',
      type: 'boolean',
      group: 'body',
      description: 'The list of section names on the left. Turn off for short projects.',
      initialValue: true,
    }),

    // Older projects stored their page content here. Hidden unless it has data.
    defineField({
      name: 'content',
      title: 'Old page content (deprecated)',
      type: 'array',
      group: 'body',
      of: [defineArrayMember({type: 'block'}), defineArrayMember({type: 'image'})],
      description: 'Move this content into Sections. It is no longer shown on the site.',
      hidden: ({value}) => !value,
    }),
  ],
  orderings: [
    {
      title: 'Sort order, then newest',
      name: 'orderYear',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'year', direction: 'desc'},
      ],
    },
    {
      title: 'Year, newest first',
      name: 'yearDesc',
      by: [{field: 'year', direction: 'desc'}],
    },
  ],
  preview: {
    select: {title: 'title', year: 'year', featured: 'featured', media: 'coverImage'},
    prepare: ({title, year, featured, media}) => ({
      title,
      subtitle: [year, featured ? '★ Featured' : 'List'].filter(Boolean).join(' · '),
      media: media ?? (featured ? StarFilledIcon : CaseIcon),
    }),
  },
})
