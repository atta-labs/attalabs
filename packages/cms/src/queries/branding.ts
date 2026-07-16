import type { SanityClient } from '@sanity/client'
import type { CMSBranding } from '../types'
import { createProductClient, type ProductKey } from '../client'

const FILE_PROJ = `{ _type, "url": asset->url }`
const IMAGE_PROJ = `{ _type, "url": asset->url }`

const BRANDING_PROJECTION = `{
  _id,
  productId,
  productName,
  paliRoot,
  paliMeaning,
  tagline,
  bladeDirection,
  interiorElement,
  interiorMeaning,
  shapeNotes,
  outlineDescription,
  outlineUseCases,
  outlineMinSizePx,
  solidDescription,
  solidUseCases,
  solidMinSizePx,
  clearSpace,
  forbidden,
  "logoOutlineLight": logoOutlineLight ${FILE_PROJ},
  "logoOutlineDark": logoOutlineDark ${FILE_PROJ},
  "logoSolidLight": logoSolidLight ${FILE_PROJ},
  "logoSolidDark": logoSolidDark ${FILE_PROJ},
  "logoFavicon": logoFavicon ${FILE_PROJ},
  "appleTouchIcon": appleTouchIcon ${IMAGE_PROJ},
  "faviconIco": faviconIco ${FILE_PROJ}
}`

async function getBranding(client: SanityClient, id: string): Promise<CMSBranding | null> {
  return client.fetch(`*[_type == "branding" && _id == $id][0] ${BRANDING_PROJECTION}`, { id })
}

/**
 * Fetch a product's branding singleton from that product's own Sanity project.
 *
 * Ecosystem surfaces that show several products' logos side by side call this
 * once per product key — each read targets the right project by construction.
 */
export async function getProductBranding(product: ProductKey): Promise<CMSBranding | null> {
  return getBranding(createProductClient(product), `branding-${product}`)
}
