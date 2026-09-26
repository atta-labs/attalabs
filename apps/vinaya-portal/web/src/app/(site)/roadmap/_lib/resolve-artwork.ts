import 'server-only'
import type { RoadmapMilestone } from '@atta/cms'
import { sanitizeSvg } from './sanitize-svg'

// What a roadmap card shows, decided entirely by that card's own CMS `image` —
// never by its `version`, so an empty, renumbered or brand-new version still gets
// its own artwork, and a new milestone's artwork needs no code change.
export type MilestoneArtwork = { kind: 'svg'; markup: string } | { kind: 'image'; url: string } | { kind: 'none' }

// Only the Sanity CDN is ever fetched: `asset->url` is data in the Content Lake,
// not something Studio alone controls, so a URL on any other host, port or path
// (an internal address included) is refused rather than requested from the
// server, and redirects are not followed.
const ARTWORK_HOST = 'cdn.sanity.io'
const ARTWORK_PATH = '/images/'
// The marks are a few KB; anything far larger is not a mark, and would only feed
// the sanitizer's DOM parser. A hung CDN must not stall the page's render.
const MAX_SVG_BYTES = 256 * 1024
const FETCH_TIMEOUT_MS = 5000

function parseCdnUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    const onCdn =
      parsed.protocol === 'https:' &&
      parsed.hostname === ARTWORK_HOST &&
      parsed.port === '' &&
      parsed.pathname.startsWith(ARTWORK_PATH)
    return onCdn ? parsed : null
  } catch {
    return null
  }
}

// Sanity CDN asset URLs are content-hashed and immutable (a re-upload is a new
// URL), so the fetch is cached indefinitely. Only a `.svg` asset is fetched at all
// (a raster goes straight to `next/image`, never downloaded here), and it is
// treated as SVG only when the response's `content-type` agrees — never on the URL
// suffix alone. Nothing here throws: a refused URL, failed or oversized fetch
// falls back to the placeholder, a non-SVG image to the `next/image` path.
export async function resolveArtwork(image: RoadmapMilestone['image']): Promise<MilestoneArtwork> {
  const url = image?.url
  const parsed = url ? parseCdnUrl(url) : null
  if (!url || !parsed) return { kind: 'none' }
  if (!parsed.pathname.endsWith('.svg')) return { kind: 'image', url }
  try {
    const res = await fetch(url, {
      cache: 'force-cache',
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
    if (!res.ok) return { kind: 'none' }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('image/svg+xml')) return { kind: 'image', url }
    if (Number(res.headers.get('content-length') ?? 0) > MAX_SVG_BYTES) return { kind: 'none' }
    const body = await res.text()
    if (body.length > MAX_SVG_BYTES) return { kind: 'none' }
    const markup = sanitizeSvg(body)
    return markup.includes('<svg') ? { kind: 'svg', markup } : { kind: 'none' }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[roadmap] artwork fetch failed:', url, err)
    }
    return { kind: 'none' }
  }
}
