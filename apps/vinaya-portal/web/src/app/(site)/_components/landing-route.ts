/**
 * Whether `usePathname()`'s value is the landing page, `/`.
 *
 * `/index` counts too. Next.js names the root page `/index` internally, and a background
 * regeneration of the prerendered landing page can reach the render with that name
 * instead of `/`: Next's own server normalizes it back in several places
 * (`pathname === '/index' ? '/' : pathname` in `base-server.js`, `route-module.js` and
 * the app-page handler), but not every path does it before the layout renders. A
 * `=== '/'` test alone then SSRs the landing page as an ordinary route, and that HTML
 * stays cached until the next regeneration: here, a top bar with its controls visible
 * and a `pt-14` gap above the hero, both painted before any JS runs.
 *
 * The one rule `TopBarChromeHost` (the bar's SSR'd `data-bare`/`data-bar-hidden`) and
 * `SiteContentPad` (no `pt-14` on landing) read, so the two can never disagree about
 * which page is landing.
 */
export function isLandingRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/index'
}
