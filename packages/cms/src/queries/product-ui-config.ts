import type { SanityClient } from '@sanity/client'
import type { PortalUiConfig } from '../types'

const THEME_PROJECTION = `{
  _id,
  name,
  light,
  dark,
  typography,
  spacing,
  shadows
}`

const LIBRARY_PROJECTION = `{
  _id,
  id,
  name,
  description,
  style,
  order
}`

const PRODUCT_UI_QUERY = (documentType: string, documentId: string) =>
  `*[_type == "${documentType}" && _id == "${documentId}"][0] {
      _id,
      userInterface {
        "theme": theme-> ${THEME_PROJECTION},
        colorScheme,
        "library": library-> ${LIBRARY_PROJECTION}
      }
    }`

/** Fetch a product UI config singleton with dereferenced theme and library */
export async function getProductUiConfig(
  client: SanityClient,
  documentType: string,
  documentId: string
): Promise<PortalUiConfig | null> {
  // Bypass Sanity CDN so theme changes from the admin are visible immediately.
  // useCdn: true (production default) caches responses and delays propagation after saves.
  const liveClient = client.withConfig({ useCdn: false })
  return liveClient.fetch(PRODUCT_UI_QUERY(documentType, documentId))
}

export async function getHeraldConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'heraldConfig', 'heraldConfig')
}

export async function getAttaConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'attaConfig', 'attaConfig')
}

export async function getVitakkaConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'vitakkaConfig', 'vitakkaConfig')
}

export async function getVadaConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'vadaConfig', 'vadaConfig')
}
