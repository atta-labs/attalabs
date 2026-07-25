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
      // `size` is a RETRO-ONLY prop, outside the cross-library contract — that
      // contract covers the component NAME, not this prop: each library derives
      // its own `SwitchProps` from its own installed component, and only retro
      // ships a `size` (`.claude/skills/ui-library-system/SKILL.md` § Switch).
      // This app's library is CMS-resolved and currently retro. It does NOT
      // degrade harmlessly if that changes: basic/animate/brutal reject the prop
      // at COMPILE time (verified — `TS2322: Type '{ size: string; }' is not
      // assignable to …` against all three), so `typecheck` and `next build`
      // fail rather than the prop being silently ignored at runtime. Drop this
      // line if the library ever resolves to anything but retro.
      size='sm'
      checked={isStudio}
      onCheckedChange={(checked) => router.push(checked ? '/studio' : '/')}
      aria-label={isStudio ? 'Currently on Studio. Switch to Portal.' : 'Currently on Portal. Switch to Studio.'}
    />
  )
}
