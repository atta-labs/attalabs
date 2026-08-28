'use client'

import { usePathname } from 'next/navigation'
import { createContext, type ReactNode, useContext } from 'react'

export type FooterPlacement = 'content' | 'hidden' | 'site'

/**
 * A `/docs` route that owns its own scroll pane must render the footer inside
 * that pane rather than after the whole shell — true of the doctrine sidebar
 * routes and equally of `/docs/cli` and `/docs/config`, which bring panes of
 * their own. State Machine is the one `/docs` page with no pane of its own, so
 * it keeps the site-level footer; Harness is the one deliberate footer-less
 * route, because its diagram fills the available viewport.
 *
 * Owning a pane is a property of the route group, not of any one route, so the
 * rule is a single prefix match with two named exceptions. Per-route `content`
 * arms (`/docs/cli` carried one) are redundant with that prefix and were
 * removed: an arm that can never decide anything reads as a rule when it is
 * only an echo of one.
 */
export function footerPlacement(pathname: string): FooterPlacement {
  if (pathname === '/docs/harness') return 'hidden'
  if (pathname.startsWith('/docs/') && pathname !== '/docs/state-machine') return 'content'
  return 'site'
}

const FooterContext = createContext<ReactNode>(null)

export function FooterGate({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const placement = footerPlacement(usePathname() ?? '')

  return (
    <FooterContext.Provider value={footer}>
      {children}
      {placement === 'site' ? footer : null}
    </FooterContext.Provider>
  )
}

/** Renders the site footer in a nested layout's own content scroll pane. */
export function FooterContentSlot() {
  const footer = useContext(FooterContext)
  return <>{footer}</>
}
