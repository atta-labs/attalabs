import type { SanityClient } from '@sanity/client'
import type { CMSBranding } from '../types'

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

export const getHeraldBranding = (client: SanityClient): Promise<CMSBranding | null> =>
  getBranding(client, 'branding-herald')

export const getAttaBranding = (client: SanityClient): Promise<CMSBranding | null> =>
  getBranding(client, 'branding-atta')

export const getVadaBranding = (client: SanityClient): Promise<CMSBranding | null> =>
  getBranding(client, 'branding-vada')

export const getVinayaBranding = (client: SanityClient): Promise<CMSBranding | null> =>
  getBranding(client, 'branding-vinaya')

export const getAttalabsBranding = (client: SanityClient): Promise<CMSBranding | null> =>
  getBranding(client, 'branding-attalabs')
