import 'server-only'
import { cache } from 'react'

const REGISTRY_URL = 'https://registry.npmjs.org/@attalabs/vinaya'
const FETCH_TIMEOUT_MS = 5000

export type PublishedVersion = { version: string } | { fallback: true }

const REVALIDATE_SECONDS = 3600 // the badge changes once per release — hourly is plenty

/**
 * Queries the public npm registry for `@attalabs/vinaya`'s `dist-tags.latest` —
 * deliberately NOT read from this monorepo's manifest, which holds the
 * to-be-published version and would reproduce the exact source-vs-published skew
 * this stamp exists to surface. Never throws.
 *
 * `/roadmap` is a dynamic route, so this genuinely runs on every request — `next:
 * { revalidate }` is what keeps most of those requests from paying for a live
 * registry round trip: Next's Data Cache stores the fetch result and only refetches
 * once it's stale, rather than the `AbortController` timeout below being the only
 * thing standing between a pageview and a live HTTP call every time.
 *
 * Exported unwrapped (as opposed to `getPublishedVersion` below) so tests can
 * call it directly without a React render/request scope, which `cache()`
 * requires.
 */
export async function fetchPublishedVersion(): Promise<PublishedVersion> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(REGISTRY_URL, { signal: controller.signal, next: { revalidate: REVALIDATE_SECONDS } })
    } finally {
      clearTimeout(timeout)
    }
    if (!res.ok) return { fallback: true }

    const data = (await res.json()) as { 'dist-tags'?: { latest?: string } }
    const version = data['dist-tags']?.latest
    if (!version) return { fallback: true }

    return { version }
  } catch {
    return { fallback: true }
  }
}

/**
 * `cache()` only de-dupes the fetch across callers within ONE render pass — it does
 * NOT persist across requests. Cross-request caching is `fetchPublishedVersion`'s own
 * `next: { revalidate }` option, above. This is what pages call.
 */
export const getPublishedVersion = cache(fetchPublishedVersion)
