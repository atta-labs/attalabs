import type { ProductKey } from '../client'
import type { CMSBranding, PortalUiConfig } from '../types'
import { getProductBranding } from './branding'
import { getProductConfig } from './product-ui-config'

export type ProductCms = {
  config: PortalUiConfig | null
  branding: CMSBranding | null
}

/**
 * Degrade gracefully when the CMS is unreachable, but never in silence: a null
 * theme renders an unbranded page that still looks plausible, so a swallowed
 * failure can survive review. Production stays quiet (the fallback is the
 * intended behaviour there); development says what broke.
 */
async function orNull<T>(label: string, promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const reason = error instanceof Error ? error.message : String(error)
      console.error(`[@atta/cms] ${label} failed — falling back to no CMS content. ${reason}`)
    }
    return null
  }
}

/**
 * Everything a product's root layout needs from the CMS, in one call.
 *
 * The product key is the only input: it resolves the Sanity project, the config
 * singleton, and the branding document. Pass the key of the product whose
 * *content* is wanted — a consumer that deliberately borrows another product's
 * identity passes that product's key.
 */
export async function getProductCms(product: ProductKey): Promise<ProductCms> {
  const [config, branding] = await Promise.all([
    orNull(`${product} config`, getProductConfig(product)),
    orNull(`${product} branding`, getProductBranding(product))
  ])

  return { config, branding }
}
