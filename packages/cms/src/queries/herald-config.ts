import type { SanityClient } from '@sanity/client'
import type { HeraldConfig } from '../types'

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

/** Fetch the heraldConfig singleton with dereferenced theme and library */
export async function getHeraldConfig(client: SanityClient): Promise<HeraldConfig | null> {
  return client.fetch(
    `*[_type == "heraldConfig" && _id == "heraldConfig"][0] {
      _id,
      userInterface {
        "theme": theme-> ${THEME_PROJECTION},
        colorScheme,
        "library": library-> ${LIBRARY_PROJECTION}
      }
    }`
  )
}
