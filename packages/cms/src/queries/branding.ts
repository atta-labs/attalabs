import type { SanityClient } from '@sanity/client'
import type { CMSBranding } from '../types'

const FILE_PROJ = `{ _type, "url": asset->url }`
const IMAGE_PROJ = `{ _type, "url": asset->url }`

const FAVICON_SET_PROJ = `{
  "ico": ico ${FILE_PROJ},
  "png16": png16 ${IMAGE_PROJ},
  "png32": png32 ${IMAGE_PROJ},
  "png48": png48 ${IMAGE_PROJ},
  "png64": png64 ${IMAGE_PROJ},
  "png128": png128 ${IMAGE_PROJ},
  "png256": png256 ${IMAGE_PROJ},
  "png512": png512 ${IMAGE_PROJ}
}`

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
  "logoLockupOutlineLight": logoLockupOutlineLight ${FILE_PROJ},
  "logoLockupOutlineDark": logoLockupOutlineDark ${FILE_PROJ},
  "logoLockupSolidLight": logoLockupSolidLight ${FILE_PROJ},
  "logoLockupSolidDark": logoLockupSolidDark ${FILE_PROJ},
  "appleTouchIcon": appleTouchIcon ${IMAGE_PROJ},
  "faviconLight": faviconLight ${FAVICON_SET_PROJ},
  "faviconDark": faviconDark ${FAVICON_SET_PROJ}
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

export const getVitakkaBranding = (client: SanityClient): Promise<CMSBranding | null> =>
  getBranding(client, 'branding-vitakka')
