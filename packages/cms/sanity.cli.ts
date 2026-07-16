import { defineCliConfig } from 'sanity/cli'

const product = process.env.SANITY_STUDIO_PRODUCT
const isAtta = product === 'atta'
const isVada = product === 'vada'
const isVinaya = product === 'vinaya'
const isAttalabs = product === 'attalabs'

export default defineCliConfig({
  api: {
    projectId:
      process.env.SANITY_STUDIO_PROJECT_ID ||
      (isAtta ? '892o2m9f' : isVada ? 'ofnj2ojb' : isVinaya ? 'o56nzgrr' : isAttalabs ? 'l5n0n8nn' : 'e9gbd2d1'),
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  deployment: {
    appId:
      process.env.SANITY_STUDIO_APP_ID ||
      (isAtta
        ? 'ne4jogb79tawox8bo96irbrh'
        : isVada
          ? 'pmbemd30l0taw6d61c0uyz5v'
          : isVinaya
            ? 'm457f9vl1jcgy3gkunej99wx'
            : isAttalabs
              ? 'kru5173ij5xavsb6fn4jiz47'
              : 'dl47uh4y5jmv2on69nzc6yt0')
  }
})
