import { getScienceIndex } from '../lib/content'
import { ScienceSidebarClient } from './ScienceSidebarClient'

export async function ScienceSidebar() {
  const groups = await getScienceIndex()
  const payload = groups.map((g) => ({
    id: g.id,
    label: g.label,
    items: g.items.map((item) => ({
      slug: item.slug,
      href: item.href,
      title: item.title
    }))
  }))
  return <ScienceSidebarClient groups={payload} />
}
