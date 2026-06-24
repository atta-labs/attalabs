import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

const product = process.env.SANITY_STUDIO_PRODUCT
const isAtta = product === 'atta'
const isVada = product === 'vada'
const isVitakka = product === 'vitakka'
const isAttalabs = product === 'attalabs'

export default defineConfig({
  name: isAtta ? 'atta' : isVada ? 'vada' : isVitakka ? 'vitakka' : isAttalabs ? 'attalabs' : 'herald',
  title: isAtta
    ? 'Atta CMS'
    : isVada
      ? 'Vada CMS'
      : isVitakka
        ? 'Vitakka CMS'
        : isAttalabs
          ? 'AttalLabs CMS'
          : 'Herald CMS',
  projectId:
    process.env.SANITY_STUDIO_PROJECT_ID ||
    (isAtta ? 'l5n0n8nn' : isVada ? 'ofnj2ojb' : isVitakka ? 'o56nzgrr' : isAttalabs ? '892o2m9f' : 'e9gbd2d1'),
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
                  .title('Branding')
                  .child(S.document().schemaType('branding').documentId('branding-atta').title('Atta Branding'))
              ])
          : isVada
            ? S.list()
                .title('Vada Content')
                .items([
                  S.listItem()
                    .title('Vada Config')
                    .child(S.document().schemaType('vadaConfig').documentId('vadaConfig').title('Vada Config')),
                  S.listItem()
                    .title('Branding')
                    .child(S.document().schemaType('branding').documentId('branding-vada').title('Vada Branding'))
                ])
            : isVitakka
              ? S.list()
                  .title('Vitakka Content')
                  .items([
                    S.listItem()
                      .title('Vitakka Config')
                      .child(
                        S.document().schemaType('vitakkaConfig').documentId('vitakkaConfig').title('Vitakka Config')
                      ),
                    S.listItem()
                      .title('Branding')
                      .child(
                        S.document().schemaType('branding').documentId('branding-vitakka').title('Vitakka Branding')
                      )
                  ])
              : isAttalabs
                ? S.list()
                    .title('AttalLabs Content')
                    .items([
                      S.listItem()
                        .title('AttalLabs Config')
                        .child(
                          S.document()
                            .schemaType('attalabsConfig')
                            .documentId('attalabsConfig')
                            .title('AttalLabs Config')
                        ),
                      S.listItem()
                        .title('Branding')
                        .child(
                          S.document()
                            .schemaType('branding')
                            .documentId('branding-attalabs')
                            .title('AttalLabs Branding')
                        ),
                      S.listItem()
                        .title('User Interface')
                        .child(
                          S.list()
                            .title('AttalLabs User Interface')
                            .items([
                              S.listItem()
                                .title('Themes')
                                .child(S.documentTypeList('uiTheme').title('AttalLabs Themes')),
                              S.listItem()
                                .title('Libraries')
                                .child(S.documentTypeList('library').title('AttalLabs Libraries'))
                            ])
                        )
                    ])
                : S.list()
                    .title('Herald Content')
                    .items([
                      S.listItem()
                        .title('Herald Config')
                        .child(
                          S.document().schemaType('heraldConfig').documentId('heraldConfig').title('Herald Config')
                        ),
                      S.listItem()
                        .title('Branding')
                        .child(
                          S.document().schemaType('branding').documentId('branding-herald').title('Herald Branding')
                        )
                    ])
    }),
    visionTool()
  ],
  schema: { types: schemaTypes }
})
