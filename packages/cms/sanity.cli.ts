import { defineCliConfig } from 'sanity/cli'

const isAtta = process.env.SANITY_STUDIO_PRODUCT === 'atta'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || (isAtta ? '892o2m9f' : 'e9gbd2d1'),
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  }
})
