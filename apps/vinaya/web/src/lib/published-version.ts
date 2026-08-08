import 'server-only'
import { cache } from 'react'

const REGISTRY_URL = 'https://registry.npmjs.org/@attalabs/vinaya'
const FETCH_TIMEOUT_MS = 5000

export type PublishedVersion = { version: string } | { fallback: true }

/**
 * Queries the public npm registry for `@attalabs/vinaya`'s `dist-tags.latest`
 * at build time — deliberately NOT read from this monorepo's manifest, which
 * holds the to-be-published version and would reproduce the exact
 * source-vs-published skew this stamp exists to surface. Never throws.
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
      res = await fetch(REGISTRY_URL, { signal: controller.signal })
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
 * `cache()` de-dupes the fetch across the pages that call it within one
 * render pass; the result becomes a per-build constant, never refetched at
 * request time. This is what pages call — see `fetchPublishedVersion` above
 * for the underlying, directly-testable logic.
 */
export const getPublishedVersion = cache(fetchPublishedVersion)
