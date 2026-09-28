import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'winston zhao portfolio',

  projectId: '7k8ajlip',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    // Used by the "Featured projects" list, so a project created there is
    // featured from the start
    templates: (prev) => [
      ...prev,
      {
        id: 'project-featured',
        title: 'Featured project',
        schemaType: 'project',
        value: {featured: true},
      },
    ],
  },
})
