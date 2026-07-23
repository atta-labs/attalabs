'use client'

import { Switch } from '@atta/ui/components'
import { useRouter } from 'next/navigation'

type Segment = 'portal' | 'studio'

/**
 * The switch itself — the active library's own `Switch` (retroui's Radix-flavor
 * paste under `retro`), flanked by its two destination labels.
 *
 * This is a client component ONLY because a switch commits by firing
 * `onCheckedChange` rather than by being a link, so navigation has to happen in
 * a handler. The D-126 authorization gate deliberately does NOT live here — it
 * stays in the async server component that renders this one, so a request that
 * is not authorized never ships this control to the browser at all.
 *
 * FOUR known regressions against the two anchors this replaced. All are
 * inherent to a switch rather than defects in this implementation, and the
 * decision to accept them is the Principal's (#647 review, finding 1):
 *
 *  1. No `href` — no middle-click, cmd-click or "open in new tab", and no
 *     crawlable link between Portal and Studio.
 *  2. Requires JavaScript. Navigation happens in `onCheckedChange`, so the
 *     control is inert without it; the anchors worked without JS. Radix's
 *     hidden mirror input is `aria-hidden`/`tabindex="-1"` and belongs to no
 *     form, so there is no no-JS fallback path.
 *  3. `aria-current='page'` is gone. A switch's role means "setting on/off",
 *     not "you are here". Partially mitigated below: the accessible name
 *     states the current surface outright rather than leaving it to be
 *     inferred from `aria-checked`.
 *  4. There are no visible text labels at all — the switch stands alone, so the
 *     accessible name below is the ONLY surface-name carrier (it states the
 *     current surface and the destination outright rather than leaving either
 *     to be inferred from `aria-checked`).
 */
export function ProductSwitchControl({ current }: { current: Segment }) {
  const router = useRouter()
  const isStudio = current === 'studio'

  return (
    <div className='flex items-center'>
      <Switch
        checked={isStudio}
        onCheckedChange={(checked) => router.push(checked ? '/studio' : '/')}
        aria-label={isStudio ? 'Currently on Studio. Switch to Portal.' : 'Currently on Portal. Switch to Studio.'}
      />
    </div>
  )
}
