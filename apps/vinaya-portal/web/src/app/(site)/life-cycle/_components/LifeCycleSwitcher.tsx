'use client'

import { ChromeFrame, Tabs, TabsList, TabsTrigger } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import type { Ref } from 'react'
import type { LifeCycleId } from '../_lib/life-cycles'
import { LIFE_CYCLES } from '../_lib/life-cycles'

// A sticky sub-bar that pins directly under the fixed TopBar for as long as the
// panels section is in view, then scrolls away with it. `sticky top-0` lands
// under the TopBar, not behind it, because `SiteContentPad` — the scroll
// container — carries the bar-height `pt-14` and sticky insets resolve inside
// that padding. No slot in the shared TopBar is involved.
//
// Fixed height, no collapse: it always shows the full tab row, so it always
// says where you are. It is a full-width opaque bar rather than a floating
// card, so panel content scrolls cleanly underneath it instead of showing
// around it, and the tabs stretch to share the bar's width rather than
// overflowing it on narrow viewports.
//
// The outer wrapper owns `sticky` (and the ref the scroll math measures)
// because `ChromeFrame` is library-resolved: retro's bar wraps its `className`
// target in its own float margin, so putting `sticky` on `ChromeFrame` itself
// would pin the inner card, not the frame.
export function LifeCycleSwitcher({
  ref,
  active,
  onChange
}: {
  ref?: Ref<HTMLDivElement>
  active: LifeCycleId
  onChange: (id: LifeCycleId) => void
}) {
  return (
    <div ref={ref} className='sticky top-0 z-20'>
      <ChromeFrame variant='bar' className='justify-center px-4 py-2'>
        <Tabs value={active} onValueChange={(value) => onChange(value as LifeCycleId)} className='w-full max-w-md'>
          <TabsList className='w-full'>
            {LIFE_CYCLES.map((cycle) => (
              <TabsTrigger key={cycle.id} value={cycle.id} className='min-w-0 flex-1 justify-center'>
                <Text as='span' className='font-mono text-xs uppercase tracking-widest'>
                  {cycle.label}
                </Text>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </ChromeFrame>
    </div>
  )
}
