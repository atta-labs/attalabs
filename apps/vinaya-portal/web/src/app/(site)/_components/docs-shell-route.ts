/**
 * Whether a route renders inside the docs shell (`DocsShell`: a full-height sidebar with
 * the wordmark on top, and a body carrying its own logo-less nav strip) instead of under
 * the site-wide fixed top bar.
 *
 * Every `/docs/*` page does, except State Machine: it has no sidebar and no pane of its
 * own, so it keeps the plain site top bar with the logo, full width, like every page
 * outside `/docs`. `/docs` itself is a redirect and never renders.
 *
 * The one rule both sides of that split read: `TopBarChromeHost` renders no fixed bar on
 * these routes, `SiteContentPad` reserves no `pt-14` for one, and each docs layout that
 * renders `DocsShell` draws the bar inside its body instead. A new `/docs/*` route that
 * renders without `DocsShell` must be added here as an exception, or it gets no top bar.
 */
export function usesDocsShell(pathname: string): boolean {
  return pathname.startsWith('/docs/') && pathname !== '/docs/state-machine'
}
