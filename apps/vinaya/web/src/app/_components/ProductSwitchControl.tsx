'use client'

import { Switch } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { useRouter } from 'next/navigation'

type Segment = 'portal' | 'studio'

/**
 * Client component ONLY because a switch commits by firing `onCheckedChange`
 * rather than being a link, so navigation happens in a handler. The
 * authorization gate does NOT live here — it stays in the async server
 * component that renders this one, so an unauthorized request never ships this
 * control to the browser at all.
 *
 * The visible STUDIO label exists because the bare switch's purpose was
 * unreadable to a first-time visitor — nothing in the topbar's right cluster
 * hinted that it was a destination toggle at all. The accessible name
 * (`aria-label`, which states the current surface outright) is unchanged and
 * unduplicated by the new text — the label names the destination, the
 * `aria-label` still carries the current-surface state a screen reader needs.
 */
export function ProductSwitchControl({ current }: { current: Segment }) {
  const router = useRouter()
  const isStudio = current === 'studio'

  return (
    <div className='flex flex-col items-center'>
      <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
        Studio
      </Text>
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
    </div>
  )
}
