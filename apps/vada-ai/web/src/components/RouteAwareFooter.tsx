'use client'

// Renders the Vāda Footer everywhere EXCEPT the deliberate hero and the live
// deliberation pages. Those pages own their viewport (full-height hero,
// fixed-bottom input bar / sticky transcript end) and the global Footer
// fights that layout. Removed locally (not globally) so Herald's Footer is
// untouched — only Vāda's app suppresses it on these surfaces.
//
// Laid out like Vinaya Portal's footer: the shared Footer is given the same
// logo lockup the top bar uses and a row of links (Vinaya's look comes from
// these two props, not from a different component).

import { Footer } from '@atta/ui/footer'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { NavLink } from '@/lib/route-config'

const FOOTER_SUPPRESSED_PREFIXES = ['/deliberate', '/deliberation/']

export function RouteAwareFooter({ logo, links }: { logo?: ReactNode; links: NavLink[] }) {
  const pathname = usePathname() ?? ''
  const suppressed = FOOTER_SUPPRESSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
  if (suppressed) return null
  // no rule above it, and its own surface so it reads apart from the last section — styled
  // from here so the shared Footer stays untouched for every other product
  return (
    <div className='bg-card [&>footer]:border-t-0'>
      <Footer product='vada' logo={logo} links={links.map(({ label, href }) => ({ label, href }))} />
    </div>
  )
}
