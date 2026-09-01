import 'server-only'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { getProductCms, type ProductCms } from '@atta/cms'

const REVALIDATE_SECONDS = 60

/**
 * `getProductCms('vinayaPortal')`'s underlying `getProductUiConfig` deliberately
 * bypasses Sanity's CDN (`packages/cms/src/queries/product-ui-config.ts`) so a
 * change made in the CMS admin is visible immediately. That was a fine tradeoff
 * while this app force-rendered every route dynamically; once dynamic rendering
 * is no longer forced (task 3, `#916`), "immediately" instead means a live
 * Sanity round-trip on every request — and this app had two independent call
 * sites paying that cost per render (the root layout and `(site)/layout.tsx`
 * each called `getProductCms` on their own).
 *
 * `unstable_cache` trades that immediacy for a `REVALIDATE_SECONDS` staleness
 * window — the right tradeoff for a public marketing site. It wraps the whole
 * `getProductCms` call rather than passing `next: { revalidate }` through to
 * `@sanity/client`'s own `.fetch()`: that per-call option is real and does get
 * read by `@sanity/client` (`_fetch` in `node_modules/@sanity/client/dist/index.js`
 * folds `cache`/`next` into a `fetch` options bag that `get-it`'s node adapter
 * then routes through the global `fetch()` — Next's own patched one, in a
 * Next.js request scope — instead of its default `http`/`https` adapter), but
 * neither `getProductUiConfig` nor `getProductBranding` (`packages/cms`) expose
 * a way for a caller to pass it in, and `packages/cms` is out of this task's
 * surface. Wrapping the call at this app boundary gets the same caching
 * outcome without touching the package.
 *
 * Exported unwrapped so tests can call it directly without a Next.js request
 * scope, which `unstable_cache`/`cache()` require — same shape as
 * `fetchPublishedReleaseMetrics` in `./published-release-metrics.ts`.
 */
export async function fetchPortalCms(): Promise<ProductCms> {
  return getProductCms('vinayaPortal')
}

const getCachedPortalCms = unstable_cache(fetchPortalCms, ['vinaya-portal-cms'], {
  revalidate: REVALIDATE_SECONDS
})

/**
 * The one CMS read for this app. `src/app/layout.tsx` (render + metadata) and
 * `src/app/(site)/layout.tsx` all call this instead of
 * `getProductCms('vinayaPortal')` directly, collapsing what were up to three
 * independent live Sanity round-trips per render into one revalidate-windowed,
 * request-deduped (`cache()`) read.
 */
export const getPortalCms = cache(getCachedPortalCms)
