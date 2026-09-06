'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Compensates for the fixed `TopBarChromeHost` reserving no space in flow: every route
 * gets `pt-14` (3.5rem, the bar's own `h-14`) except the landing route, whose hero section
 * deliberately sits flush at the true page top so its canvas paints under the transparent
 * bar (TOPBAR-LOCKUP.md).
 *
 * This can't live as static padding on the shared scroll container in `layout.tsx` —
 * `position: sticky`'s stick offset is computed against that container's own padding box,
 * so any padding-top there adds directly onto the hero's `sticky top-0` viewport, pushing
 * it below the window's bottom edge by the same amount (reproduced live: hero's `top`
 * measured at 63px with a 63px container padding, instead of 0). Padding has to live on a
 * plain, non-scrolling wrapper one level in, and skip the hero route entirely.
 */
export function SiteContentPad({ children }: { children: ReactNode }) {
  const isLanding = (usePathname() ?? '') === '/'
  return <div className={isLanding ? undefined : 'pt-14'}>{children}</div>
}
