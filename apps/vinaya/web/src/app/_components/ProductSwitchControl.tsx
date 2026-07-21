'use client'

import { Switch } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { useRouter } from 'next/navigation'

type Segment = 'portal' | 'studio'

const LABEL = 'font-sans text-xs transition-colors'

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
 * Trade-off worth knowing: unlike the anchors this replaced, a switch has no
 * `href`. Middle-click, cmd-click and "open in new tab" no longer work on it,
 * and there is no crawlable link between the two surfaces.
 */
export function ProductSwitchControl({ current }: { current: Segment }) {
  const router = useRouter()
  const isStudio = current === 'studio'

  return (
    <div className='flex items-center gap-2'>
      <Text as='span' className={`${LABEL} ${isStudio ? 'text-muted-foreground' : 'text-foreground'}`}>
        Portal
      </Text>
      <Switch
        checked={isStudio}
        onCheckedChange={(checked) => router.push(checked ? '/studio' : '/')}
        aria-label='Switch between Portal and Studio'
      />
      <Text as='span' className={`${LABEL} ${isStudio ? 'text-foreground' : 'text-muted-foreground'}`}>
        Studio
      </Text>
    </div>
  )
}
