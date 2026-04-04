import type { SanityClient } from '@sanity/client'
import type { CMSLibrary } from '../types'

const LIBRARY_PROJECTION = `{
  _id,
  id,
  name,
  description,
  style,
  order
}`

/** Fetch all published libraries, ordered by order field */
export async function getLibraries(client: SanityClient): Promise<CMSLibrary[]> {
  return client.fetch(`*[_type == "library" && !(_id in path("drafts.**"))] ${LIBRARY_PROJECTION} | order(order asc)`)
}

/** Fetch a single library by its id field */
export async function getLibraryById(client: SanityClient, id: string): Promise<CMSLibrary | null> {
  return client.fetch(`*[_type == "library" && id == $id][0] ${LIBRARY_PROJECTION}`, { id })
}
