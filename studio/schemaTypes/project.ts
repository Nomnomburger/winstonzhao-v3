import { defineArrayMember, defineField, defineType } from "sanity";

export default defineType({
  name: "project",
  title: "Project",
  type: "document",
  groups: [
    { name: "overview", title: "Overview", default: true },
    { name: "caseStudy", title: "Case Study" },
  ],
  fields: [
    // ---------------------------------------------------------------------
    // Overview — used by the home page cards/list and the top of the project page
    // ---------------------------------------------------------------------
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "overview",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "overview",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "featured",
      title: "Featured on home page",
      type: "boolean",
      group: "overview",
      initialValue: false,
      description:
        "Show this project in the image grid on the home page. If no project is featured, the four most recent projects are shown instead.",
    }),

    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      group: "overview",
      description:
        "One-line summary shown in the project list on the home page. Falls back to the description.",
    }),

    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      group: "overview",
      description: "Intro paragraph shown at the top of the project page.",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "year",
      title: "Year",
      type: "number",
      group: "overview",
      validation: (Rule) => Rule.required().min(1990).max(2100),
    }),

    defineField({
      name: "client",
      title: "Client",
      type: "string",
      group: "overview",
      description: 'Shown in the meta row on the project page, e.g. "Full Sprint — Heatmap.com".',
    }),

    defineField({
      name: "link",
      title: "Live link",
      type: "url",
      group: "overview",
      description: 'Powers the "Visit ↗" link on the project page.',
    }),

    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      group: "overview",
      options: { hotspot: true },
      description:
        "Used for the cards on the home page and as the hero image on the project page. Set a hotspot so crops stay focused.",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      group: "overview",
      of: [
        {
          type: "string",
          options: {
            list: [
              { title: "UI/UX", value: "uiux" },
              { title: "Branding", value: "branding" },
              { title: "Case Study", value: "case-study" },
              { title: "Awards", value: "awards" },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.unique(),
    }),

    // ---------------------------------------------------------------------
    // Case study — the body of the project page
    // ---------------------------------------------------------------------
    defineField({
      name: "statement",
      title: "Statement",
      type: "text",
      rows: 3,
      group: "caseStudy",
      description: "Large statement shown directly under the hero image.",
    }),

    defineField({
      name: "role",
      title: "Role",
      type: "string",
      group: "caseStudy",
      description: 'e.g. "Product Design Intern"',
    }),

    defineField({
      name: "timeline",
      title: "Timeline",
      type: "string",
      group: "caseStudy",
      description: 'e.g. "Summer 2024 — 2 months"',
    }),

    defineField({
      name: "skills",
      title: "Skills & Tools",
      type: "array",
      group: "caseStudy",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),

    defineField({
      name: "overview",
      title: "Overview",
      type: "text",
      rows: 6,
      group: "caseStudy",
    }),

    defineField({
      name: "impact",
      title: "Impact",
      type: "text",
      rows: 3,
      group: "caseStudy",
      description: "Large impact statement shown beside the overview.",
    }),

    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      group: "caseStudy",
      description:
        "Case study sections (e.g. Problem Statement, Research, Design Process). Section titles appear in the side navigation.",
      of: [
        defineArrayMember({
          type: "object",
          name: "section",
          title: "Section",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "heading",
              title: "Heading",
              type: "text",
              rows: 2,
              description: 'Large lead-in sentence, e.g. a "How might we…" statement.',
            }),
            defineField({
              name: "body",
              title: "Body",
              type: "array",
              of: [
                defineArrayMember({
                  type: "block",
                  styles: [
                    { title: "Normal", value: "normal" },
                    { title: "Heading", value: "h2" },
                    { title: "Subheading", value: "h3" },
                    { title: "Quote", value: "blockquote" },
                  ],
                  lists: [
                    { title: "Bullet", value: "bullet" },
                    { title: "Numbered", value: "number" },
                  ],
                  marks: {
                    decorators: [
                      { title: "Strong", value: "strong" },
                      { title: "Emphasis", value: "em" },
                      { title: "Underline", value: "underline" },
                    ],
                    annotations: [
                      {
                        name: "link",
                        type: "object",
                        title: "Link",
                        fields: [
                          {
                            name: "href",
                            type: "url",
                            title: "URL",
                            validation: (Rule) =>
                              Rule.uri({ scheme: ["http", "https", "mailto"] }),
                          },
                        ],
                      },
                    ],
                  },
                }),
                defineArrayMember({
                  type: "image",
                  options: { hotspot: true },
                  fields: [
                    { name: "alt", type: "string", title: "Alt text" },
                    { name: "caption", type: "string", title: "Caption" },
                  ],
                }),
              ],
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "heading" },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "title", year: "year", media: "coverImage" },
    prepare({ title, year, media }) {
      return { title, subtitle: year ? String(year) : undefined, media };
    },
  },
});
