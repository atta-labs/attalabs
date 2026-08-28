import { createProductClient, type ProductKey } from '../client'

export interface RoadmapMilestone {
  _id: string
  title: string
  // `null` until the milestone actually ships — a target/predicted version is never
  // stored here; a version is a record of what shipped, added once, at completion
  // (`roadmap-milestone.ts`'s schema description; `derive-status.ts` skips the
  // registry comparison entirely when this is absent).
  version: string | null
  description: string
  truth: string
  status: 'shipping' | 'planned' | 'dropped'
  order: number
  // `url` can be `null` even when the `image` object itself is present — the GROQ
  // projection below dereferences `asset->url`, which resolves to `null` if the
  // underlying Sanity asset was deleted while the field still references it.
  image: { url: string | null } | null
}

const ROADMAP_MILESTONES_QUERY = `*[_type == "roadmapMilestone"] | order(order asc) {
  _id,
  title,
  version,
  description,
  truth,
  status,
  order,
  "image": image{ ..., "url": asset->url }
}`

/**
 * Fetch every `roadmapMilestone` document from a product's Sanity project, in
 * manual `order`. Defaults to `vinayaPortal`, the only current consumer.
 */
export async function getRoadmapMilestones(product: ProductKey = 'vinayaPortal'): Promise<RoadmapMilestone[]> {
  return createProductClient(product).fetch(ROADMAP_MILESTONES_QUERY)
}
