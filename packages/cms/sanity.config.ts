import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'herald',
  title: 'Herald CMS',
  projectId: 'e9gbd2d1',
  dataset: 'production',
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes }
})
