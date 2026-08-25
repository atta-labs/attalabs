import { createProductClient, type ProductKey } from '../client'

export interface RoadmapMilestone {
  _id: string
  title: string
  version: string
  description: string
  truth: string
  status: 'shipping' | 'planned' | 'dropped'
  order: number
  image: { url: string } | null
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
