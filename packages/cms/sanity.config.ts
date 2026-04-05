import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

const product = process.env.SANITY_STUDIO_PRODUCT
const isAtta = product === 'atta'
const isVada = product === 'vada'
const isVitakka = product === 'vitakka'

export default defineConfig({
  name: isAtta ? 'atta' : isVada ? 'vada' : isVitakka ? 'vitakka' : 'herald',
  title: isAtta ? 'Atta CMS' : isVada ? 'Vada CMS' : isVitakka ? 'Vitakka CMS' : 'Herald CMS',
  projectId:
    process.env.SANITY_STUDIO_PROJECT_ID ||
    (isAtta ? '892o2m9f' : isVada ? '28r5u68w' : isVitakka ? '6m85m3re' : 'e9gbd2d1'),
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        isAtta
          ? S.list()
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
          : isVada
            ? S.list()
                .title('Vada Content')
                .items([
                  S.listItem()
                    .title('Vada Config')
                    .child(S.document().schemaType('vadaConfig').documentId('vadaConfig').title('Vada Config')),
                  S.listItem()
                    .title('User Interface')
                    .child(
                      S.list()
                        .title('Vada User Interface')
                        .items([
                          S.listItem().title('Themes').child(S.documentTypeList('uiTheme').title('Vada Themes')),
                          S.listItem()
                            .title('Libraries')
                            .child(S.documentTypeList('library').title('Vada Libraries'))
                        ])
                    )
                ])
          : isVitakka
            ? S.list()
                .title('Vitakka Content')
                .items([
                  S.listItem()
                    .title('Vitakka Config')
                    .child(
                      S.document()
                        .schemaType('vitakkaConfig')
                        .documentId('vitakkaConfig')
                        .title('Vitakka Config')
                    ),
                  S.listItem()
                    .title('User Interface')
                    .child(
                      S.list()
                        .title('Vitakka User Interface')
                        .items([
                          S.listItem()
                            .title('Themes')
                            .child(S.documentTypeList('uiTheme').title('Vitakka Themes')),
                          S.listItem()
                            .title('Libraries')
                            .child(S.documentTypeList('library').title('Vitakka Libraries'))
                        ])
                    )
                ])
            : S.list()
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
