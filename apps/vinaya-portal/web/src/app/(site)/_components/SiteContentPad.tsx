'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * The (site) app shell's one scroll container, and the definite-height ancestor every
 * docs-family shell's `h-full` resolves against. `h-dvh` gives it a real height,
 * `overflow-y-auto` makes it the element that scrolls, and it sits directly around the
 * route's `{children}` (`FooterGate` renders no DOM node of its own), so a docs shell's
 * `h-full` is the viewport minus this box's padding — a definite height, not `auto` —
 * and its sidebar and content pane each scroll inside it while this box itself never does.
 *
 * It also compensates for the fixed `TopBarChromeHost` reserving no space in flow: every
 * route gets `pt-14` (3.5rem, the bar's own `h-14`) except the landing route, whose hero
 * section deliberately sits flush at the true page top so its canvas paints under the
 * transparent bar (see `TopBarChromeHost`). This is the only place that height is asserted
 * for the content region; nothing else repeats it as a `calc(100dvh-…)`.
 *
 * `position: sticky`'s stick offset is measured inside its scroll container's padding, and
 * the padding lands on the SAME element that scrolls: on the landing route it carries
 * none, so the hero's `sticky top-0` still pins at the true page top; on every other route
 * a `sticky top-0` pins just under the fixed bar rather than behind it.
 */
export function SiteContentPad({ children }: { children: ReactNode }) {
  const isLanding = (usePathname() ?? '') === '/'
  return <div className={isLanding ? 'h-dvh overflow-y-auto' : 'h-dvh overflow-y-auto pt-14'}>{children}</div>
}
