import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'atta',
  title: 'Atta CMS',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'e9gbd2d1',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Atta Content')
          .items([
            S.listItem()
              .title('Atta Config')
              .child(S.document().schemaType('attaConfig').documentId('attaConfig').title('Atta Config')),
            S.listItem()
              .title('User Interface')
              .child(
                S.list()
                  .title('Atta User Interface')
                  .items([
                    S.listItem().title('Themes').child(S.documentTypeList('uiTheme').title('Atta Themes')),
                    S.listItem().title('Libraries').child(S.documentTypeList('library').title('Atta Libraries'))
                  ])
              )
          ])
    }),
    visionTool()
  ],
  schema: { types: schemaTypes }
})
