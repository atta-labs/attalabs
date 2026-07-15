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
  const themeId = typeof ui.theme === 'string' ? ui.theme : ui.theme?._ref
  const libraryId = typeof ui.library === 'string' ? ui.library : ui.library?._ref

  const attaClient = createProductClient('attalabs', { useCdn: false })

  // 2. Fetch full details from Attalabs project if theme/library are string or reference IDs
  const [themeDoc, libraryDoc] = await Promise.all([
    themeId
      ? attaClient.fetch(`*[_type == "uiTheme" && _id == $id][0] ${THEME_PROJECTION}`, { id: themeId })
      : Promise.resolve(null),
    libraryId
      ? attaClient.fetch(`*[_type == "library" && _id == $id][0] ${LIBRARY_PROJECTION}`, { id: libraryId })
      : Promise.resolve(null)
  ])

  // 3. Reconstruct standard PortalUiConfig shape so layout consumers require zero changes
  if (themeDoc) {
    config.userInterface.theme = themeDoc
  } else if (themeId) {
    config.userInterface.theme = null
  }

  if (libraryDoc) {
    config.userInterface.library = libraryDoc
  } else if (libraryId) {
    config.userInterface.library = null
  }

  return config
}

export async function getHeraldConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'heraldConfig', 'heraldConfig')
}

export async function getAttaConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'attaConfig', 'attaConfig')
}

export async function getVinayaConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'vinayaConfig', 'vinayaConfig')
}

export async function getVadaConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'vadaConfig', 'vadaConfig')
}

export async function getAttalabsConfig(client: SanityClient): Promise<PortalUiConfig | null> {
  return getProductUiConfig(client, 'attalabsConfig', 'attalabsConfig')
}
