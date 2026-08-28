'use client'

import { usePathname } from 'next/navigation'
import { createContext, type ReactNode, useContext } from 'react'

export type FooterPlacement = 'content' | 'hidden' | 'site'

/**
 * Sidebar docs own their scroll pane, so their footer must render inside that
 * pane rather than after the whole two-column shell. State Machine remains a
 * standalone page using the site-level footer. Harness is the one deliberate
 * footer-less route because its diagram fills the available viewport.
 */
export function footerPlacement(pathname: string): FooterPlacement {
  if (pathname === '/docs/harness') return 'hidden'
  if (pathname === '/docs/cli') return 'content'
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
