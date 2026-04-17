import { createClient } from '@sanity/client'

export const cmsConfig = {
  projectId: process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production'
}

/**
 * Sanity project IDs for every Atta AI product. Public identifiers — safe to
 * commit. Use {@link createProductClient} to target any of them.
 */
export const PROJECT_IDS = {
  herald: 'e9gbd2d1',
  atta: '892o2m9f',
  vada: 'ofnj2ojb',
  vitakka: 'o56nzgrr'
} as const

export type ProductKey = keyof typeof PROJECT_IDS

export function createCmsClient(options?: { token?: string; useCdn?: boolean }) {
  return createClient({
    ...cmsConfig,
    token: options?.token ?? process.env.SANITY_API_TOKEN,
    useCdn: options?.useCdn ?? cmsConfig.useCdn
  })
}

/**
 * Create a read-only Sanity client targeting a specific product's Sanity
 * project. Use this to fetch content (branding, config, theme) from another
 * product in the ecosystem — e.g. the Vāda home page showing Attā and Vitakka
 * logos alongside its own.
 *
 * No token required: reads come over the public CDN for published content.
 */
export function createProductClient(product: ProductKey, options?: { useCdn?: boolean }) {
  return createClient({
    projectId: PROJECT_IDS[product],
    dataset: cmsConfig.dataset,
    apiVersion: cmsConfig.apiVersion,
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
