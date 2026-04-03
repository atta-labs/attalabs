import { createClient } from '@sanity/client'

export const cmsConfig = {
  projectId: process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production'
}

export function createCmsClient(options?: { token?: string; useCdn?: boolean }) {
  return createClient({
    ...cmsConfig,
    token: options?.token ?? process.env.SANITY_API_TOKEN,
    useCdn: options?.useCdn ?? cmsConfig.useCdn
  })
}

/** Read-only client for fetching published content */
export const cmsClient = createClient({
  ...cmsConfig,
  useCdn: cmsConfig.useCdn
})

/** Write client for mutations (server-side only) */
export const cmsWriteClient = createClient({
  ...cmsConfig,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})
