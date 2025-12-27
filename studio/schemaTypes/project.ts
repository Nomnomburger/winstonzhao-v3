import { defineField, defineType } from "sanity";

export default defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "year",
      title: "Year",
      type: "number",
      validation: (Rule) => Rule.required().min(1990).max(2100),
    }),

    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
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

    defineField({
      name: "content",
      title: "Details Page Content",
      type: "array",
      of: [{ type: "block" }, { type: "image" }],
      description:
        "Headings, text, and images for the project detail page (case studies).",
    }),
  ],
});
