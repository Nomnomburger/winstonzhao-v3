import { defineField, defineType } from "sanity";

export default defineType({
  name: "playground",
  title: "Playground",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title (optional)",
      type: "string",
    }),

    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "year",
      title: "Year (optional)",
      type: "number",
      validation: (Rule) => Rule.min(1990).max(2100),
    }),
  ],
});
