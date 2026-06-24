import type { SanityClient } from '@sanity/client'
import type { PortalUiConfig } from '../types'
import { createProductClient } from '../client'

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

/** Fetch a product UI config singleton with dynamically resolved theme and library from Atta */
export async function getProductUiConfig(
  client: SanityClient,
  documentType: string,
  documentId: string
): Promise<PortalUiConfig | null> {
  // Bypass Sanity CDN so theme changes from the admin are visible immediately.
  const liveClient = client.withConfig({ useCdn: false })

  // 1. Fetch local config (now containing string IDs)
  const config = await liveClient.fetch(
    `*[_type == $documentType && _id == $documentId][0] {
      _id,
      userInterface {
        theme,
        colorScheme,
        library
      }
    }`,
    { documentType, documentId }
  )

  if (!config?.userInterface) {
    return config
  }

  const ui = config.userInterface
  const attaClient = createProductClient('attalabs', { useCdn: false })

  // 2. Fetch full details from Atta project if theme/library are string references
  const [themeDoc, libraryDoc] = await Promise.all([
    typeof ui.theme === 'string'
      ? attaClient.fetch(`*[_type == "uiTheme" && _id == $id][0] ${THEME_PROJECTION}`, { id: ui.theme })
      : Promise.resolve(null),
    typeof ui.library === 'string'
      ? attaClient.fetch(`*[_type == "library" && _id == $id][0] ${LIBRARY_PROJECTION}`, { id: ui.library })
      : Promise.resolve(null)
  ])

  // 3. Reconstruct standard PortalUiConfig shape so layout consumers require zero changes
  config.userInterface.theme = themeDoc
  config.userInterface.library = libraryDoc

  return config
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

export async function getAttalabsConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'attalabsConfig', 'attalabsConfig')
}
