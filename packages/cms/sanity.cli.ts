import { defineCliConfig } from 'sanity/cli'

const product = process.env.SANITY_STUDIO_PRODUCT
const isAtta = product === 'atta'
const isVada = product === 'vada'
const isVitakka = product === 'vitakka'

export default defineCliConfig({
  api: {
    projectId:
      process.env.SANITY_STUDIO_PROJECT_ID ||
      (isAtta ? '892o2m9f' : isVada ? '28r5u68w' : isVitakka ? '6m85m3re' : 'e9gbd2d1'),
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  deployment: {
    appId:
      process.env.SANITY_STUDIO_APP_ID ||
      (isAtta
        ? 'ne4jogb79tawox8bo96irbrh'
        : isVada
          ? 'm7z8p2o1'
          : isVitakka
            ? 'vsk9f2q4'
            : 'dl47uh4y5jmv2on69nzc6yt0')
  }
})
