import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'e9gbd2d1',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  deployment: {
    appId: process.env.SANITY_STUDIO_APP_ID || 'dl47uh4y5jmv2on69nzc6yt0'
  }
})
