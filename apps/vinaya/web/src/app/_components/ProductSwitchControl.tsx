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
      // ships a `size` (`.claude/skills/ui-library-system/SKILL.md`'s
      // `## Cross-product composite components` section, the `**Switch**` entry).
      // It does NOT degrade harmlessly if the resolved library changes:
      // basic/animate/brutal reject the prop at COMPILE time (verified —
      // `TS2322: Type '{ size: string; }' is not assignable to …` against all
      // three), and `apps/vinaya/web` uses the BUILD-TIME generation pattern
      // (`next.config.ts` → `generateUIIndex('vinaya')`, no
      // `typescript.ignoreBuildErrors`), so `typecheck` and `next build` fail
      // rather than the prop being silently ignored at runtime.
      //
      // The trigger is wider than a deliberate library change: `generate-ui.ts`
      // resolves `config?.userInterface?.library?.id ?? 'basic'` and swallows a
      // failed CMS fetch, so a build-time CMS outage alone is enough to fall
      // back to `basic` and break the build here. Drop this line if the library
      // ever resolves to anything but retro.
      size='sm'
      checked={isStudio}
      onCheckedChange={(checked) => router.push(checked ? '/studio' : '/')}
      aria-label={isStudio ? 'Currently on Studio. Switch to Portal.' : 'Currently on Portal. Switch to Studio.'}
    />
  )
}
