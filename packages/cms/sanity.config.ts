import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

const product = process.env.SANITY_STUDIO_PRODUCT
const isVada = product === 'vada'
const isVinaya = product === 'vinaya'
const isAttalabs = product === 'attalabs'

export default defineConfig({
  name: isVada ? 'vada' : isVinaya ? 'vinaya' : isAttalabs ? 'attalabs' : 'herald',
  title: isVada ? 'Vada CMS' : isVinaya ? 'Vinaya CMS' : isAttalabs ? 'AttalLabs CMS' : 'Herald CMS',
  projectId:
    process.env.SANITY_STUDIO_PROJECT_ID ||
    (isVada ? 'ofnj2ojb' : isVinaya ? 'o56nzgrr' : isAttalabs ? 'l5n0n8nn' : 'e9gbd2d1'),
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        isVada
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
          : isVinaya
            ? S.list()
                .title('Vinaya Content')
                .items([
                  S.listItem()
                    .title('Vinaya Config')
                    .child(S.document().schemaType('vinayaConfig').documentId('vinayaConfig').title('Vinaya Config')),
                  S.listItem()
                    .title('Branding')
                    .child(S.document().schemaType('branding').documentId('branding-vinaya').title('Vinaya Branding')),
                  S.listItem()
                    .title('Vinaya Portal Config')
                    .child(
                      S.document()
                        .schemaType('vinayaPortalConfig')
                        .documentId('vinayaPortalConfig')
                        .title('Vinaya Portal Config')
                    ),
                  S.listItem()
                    .title('Vinaya Portal Branding')
                    .child(
                      S.document()
                        .schemaType('branding')
                        .documentId('branding-vinayaPortal')
                        .title('Vinaya Portal Branding')
                    ),
                  S.listItem()
                    .title('Vinaya Studio Config')
                    .child(
                      S.document()
                        .schemaType('vinayaStudioConfig')
                        .documentId('vinayaStudioConfig')
                        .title('Vinaya Studio Config')
                    ),
                  S.listItem()
                    .title('Vinaya Studio Branding')
                    .child(
                      S.document()
                        .schemaType('branding')
                        .documentId('branding-vinayaStudio')
                        .title('Vinaya Studio Branding')
                    )
                ])
            : isAttalabs
              ? S.list()
                  .title('AttalLabs Content')
                  .items([
                    S.listItem()
                      .title('AttalLabs Config')
                      .child(
                        S.document().schemaType('attalabsConfig').documentId('attalabsConfig').title('AttalLabs Config')
                      ),
                    S.listItem()
                      .title('Branding')
                      .child(
                        S.document().schemaType('branding').documentId('branding-attalabs').title('AttalLabs Branding')
                      ),
                    S.listItem()
                      .title('User Interface')
                      .child(
                        S.list()
                          .title('AttalLabs User Interface')
                          .items([
                            S.listItem().title('Themes').child(S.documentTypeList('uiTheme').title('AttalLabs Themes')),
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
                      .child(S.document().schemaType('heraldConfig').documentId('heraldConfig').title('Herald Config')),
                    S.listItem()
                      .title('Branding')
                      .child(S.document().schemaType('branding').documentId('branding-herald').title('Herald Branding'))
                  ])
    }),
    visionTool()
  ],
  schema: { types: schemaTypes }
})
