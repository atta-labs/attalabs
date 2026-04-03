/**
 * Theme queries — GROQ queries for reading themes from Sanity.
 */

import type { SanityClient } from '@sanity/client'
import type { CMSTheme } from '../types'

const THEME_PROJECTION = `{
  _id,
  name,
  light,
  dark,
  typography,
  spacing,
  shadows
}`

/** Fetch all published themes */
export async function getThemes(client: SanityClient): Promise<CMSTheme[]> {
  return client.fetch(`*[_type == "uiTheme" && !(_id in path("drafts.**"))] ${THEME_PROJECTION} | order(name asc)`)
}

/** Fetch a single theme by ID */
export async function getThemeById(client: SanityClient, themeId: string): Promise<CMSTheme | null> {
  return client.fetch(`*[_type == "uiTheme" && _id == $themeId][0] ${THEME_PROJECTION}`, { themeId })
}

/** Fetch a single theme by name */
export async function getThemeByName(client: SanityClient, themeName: string): Promise<CMSTheme | null> {
  return client.fetch(`*[_type == "uiTheme" && name == $themeName][0] ${THEME_PROJECTION}`, {
    themeName
  })
}

/** Fetch theme names and IDs only (for picker UI) */
export async function getThemeList(
  client: SanityClient
): Promise<Array<{ _id: string; name: string; dark?: Record<string, string> }>> {
  return client.fetch(`*[_type == "uiTheme" && !(_id in path("drafts.**"))] { _id, name, dark } | order(name asc)`)
}
