'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// `/docs/harness` is deliberately footer-less at `lg`+ — its own page.tsx says why:
// `DiagramExplorer` fills exactly the viewport below the TopBar with `overflow-hidden`,
// "must be fully visible with zero scrolling." A footer rendered after it in the shared
// `(site)/layout.tsx` scroll region would force that region to scroll, breaking the
// invariant. Every other `(site)` route keeps the site-wide footer; this is the one
// deliberate exception, not a general opt-out mechanism — extend the set only for a route
// with the same "fills the viewport, zero scroll" contract, not for ordinary long pages.
const NO_FOOTER_ROUTES = new Set(['/docs/harness'])

export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (NO_FOOTER_ROUTES.has(pathname)) return null
  return <>{children}</>
}
