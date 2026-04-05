import { defineCliConfig } from 'sanity/cli'

const product = process.env.SANITY_STUDIO_PRODUCT
const isAtta = product === 'atta'
const isVada = product === 'vada'

export default defineCliConfig({
  api: {
    projectId:
      process.env.SANITY_STUDIO_PROJECT_ID ||
      (isAtta ? '892o2m9f' : isVada ? '28r5u68w' : 'e9gbd2d1'),
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  deployment: {
    appId:
      process.env.SANITY_STUDIO_APP_ID ||
      (isAtta ? 'ne4jogb79tawox8bo96irbrh' : isVada ? undefined : 'dl47uh4y5jmv2on69nzc6yt0')
  }
})
