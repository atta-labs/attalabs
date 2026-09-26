import 'server-only'
import type { RoadmapMilestone } from '@atta/cms'
import { sanitizeSvg } from './sanitize-svg'

// What a roadmap card shows, decided entirely by that card's own CMS `image` —
// never by its `version`, so an empty, renumbered or brand-new version still gets
// its own artwork, and a new milestone's artwork needs no code change.
export type MilestoneArtwork = { kind: 'svg'; markup: string } | { kind: 'image'; url: string } | { kind: 'none' }

// Sanity CDN asset URLs are content-hashed and immutable (a re-upload is a new
// URL), so the fetch is cached indefinitely. SVG is detected by the response's
// `content-type`, never the URL suffix alone. Nothing here throws: a failed fetch
// falls back to the placeholder, a non-SVG image to the `next/image` path.
export async function resolveArtwork(image: RoadmapMilestone['image']): Promise<MilestoneArtwork> {
  const url = image?.url
  if (!url) return { kind: 'none' }
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return { kind: 'none' }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('image/svg+xml')) return { kind: 'image', url }
    const markup = sanitizeSvg(await res.text())
    return markup.includes('<svg') ? { kind: 'svg', markup } : { kind: 'none' }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[roadmap] artwork fetch failed:', url, err)
    }
    return { kind: 'none' }
  }
}
