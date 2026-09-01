import { createClient } from '@sanity/client'

/**
 * Connection settings shared by every product client.
 *
 * `projectId` is deliberately absent: which Sanity project a read targets is a
 * function of *which product's content is wanted*, which the caller always
 * knows statically. It is resolved from {@link PROJECT_IDS}, never from the
 * environment. Only values that genuinely vary per environment live here.
 */
export const cmsConfig = {
  dataset: process.env.SANITY_DATASET ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production'
}

/**
 * Sanity project IDs for every Atta AI product. Public identifiers — safe to
 * commit, and identical in every environment. Use {@link createProductClient}
 * to target any of them.
 *
 * `vinayaPortal` and `vinayaStudio` deliberately share `vinaya`'s project id:
 * they are two additional product documents inside the same Sanity project,
 * not new projects. Both keys are read directly today — `vinaya-portal-web`
 * and `vinaya-studio-web`'s own root layouts each pass their own key to
 * `getProductCms`, and `tools/admin`'s root layout reads both for branding.
 * The bare `vinaya` key still exists, but no current call site targets it.
 */
export const PROJECT_IDS = {
  herald: 'e9gbd2d1',
  atta: '892o2m9f',
  vada: 'ofnj2ojb',
  vinaya: 'o56nzgrr',
  vinayaPortal: 'o56nzgrr',
  vinayaStudio: 'o56nzgrr',
  attalabs: 'l5n0n8nn'
} as const

export type ProductKey = keyof typeof PROJECT_IDS

/**
 * Create a read-only Sanity client targeting a specific product's Sanity
 * project — the only way to read product content.
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
