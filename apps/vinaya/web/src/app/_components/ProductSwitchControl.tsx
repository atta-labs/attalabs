'use client'

import { Switch } from '@atta/ui/components'
import { useRouter } from 'next/navigation'

type Segment = 'portal' | 'studio'

/**
 * Client component ONLY because a switch commits by firing `onCheckedChange`
 * rather than being a link, so navigation happens in a handler. The D-126
 * authorization gate does NOT live here — it stays in the async server
 * component that renders this one, so an unauthorized request never ships this
 * control to the browser at all.
 *
 * The control carries NO visible text label: the destination is announced by
 * the accessible name alone (`aria-label`, which states the current surface
 * outright), so the topbar's right cluster stays a row of icon-sized controls.
 */
export function ProductSwitchControl({ current }: { current: Segment }) {
  const router = useRouter()
  const isStudio = current === 'studio'

  return (
    <Switch
      size='sm'
      checked={isStudio}
      onCheckedChange={(checked) => router.push(checked ? '/studio' : '/')}
      aria-label={isStudio ? 'Currently on Studio. Switch to Portal.' : 'Currently on Portal. Switch to Studio.'}
    />
  )
}
