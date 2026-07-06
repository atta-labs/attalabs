'use client'

// Renders the Vāda Footer everywhere EXCEPT the deliberate hero and the live
// deliberation pages. Those pages own their viewport (full-height hero,
// fixed-bottom input bar / sticky transcript end) and the global Footer
// fights that layout. Removed locally (not globally) so Herald's Footer is
// untouched — only Vāda's app suppresses it on these surfaces.

import { Footer } from '@atta/ui/footer'
import { usePathname } from 'next/navigation'

const FOOTER_SUPPRESSED_PREFIXES = ['/deliberate', '/deliberation/']

export function RouteAwareFooter() {
  const pathname = usePathname() ?? ''
  const suppressed = FOOTER_SUPPRESSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
  if (suppressed) return null
  return <Footer product='vada' tagline='Multi-agent deliberation' links={[]} />
}
