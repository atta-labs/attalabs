import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'herald',
  title: 'Herald CMS',
  projectId: 'e9gbd2d1',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Herald Content')
          .items([
            S.listItem()
              .title('Herald Config')
              .child(S.document().schemaType('heraldConfig').documentId('heraldConfig').title('Herald Config')),
            S.listItem()
              .title('Atta Config')
              .child(S.document().schemaType('attaConfig').documentId('attaConfig').title('Atta Config')),
            S.listItem()
              .title('Vitakka Config')
              .child(S.document().schemaType('vitakkaConfig').documentId('vitakkaConfig').title('Vitakka Config')),
            S.listItem()
              .title('Vada Config')
              .child(S.document().schemaType('vadaConfig').documentId('vadaConfig').title('Vada Config')),
            S.listItem()
              .title('User Interface')
              .child(
                S.list()
                  .title('Herald User Interface')
                  .items([
                    S.listItem().title('Themes').child(S.documentTypeList('uiTheme').title('Herald Themes')),
                    S.listItem().title('Libraries').child(S.documentTypeList('library').title('Herald Libraries'))
                  ])
              )
          ])
    }),
    visionTool()
  ],
  schema: { types: schemaTypes }
})
