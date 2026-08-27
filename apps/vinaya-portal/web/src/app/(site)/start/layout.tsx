import type { ReactNode } from 'react'

/** The old two-part `StartSidebarHost` nav is deleted along with the seven
 * per-stage routes it pointed at (Issue #918: their content now lives at
 * `/life-cycle`). Until Issue #920 rebuilds this shell for the quickstart
 * wizard, this keeps the content container the sidebar shell used to
 * provide — without it `/start/quick` renders edge-to-edge with no padding. */
export default function StartLayout({ children }: { children: ReactNode }) {
  return (
    <main className='px-6 pb-10 lg:px-12'>
      <div className='mx-auto max-w-4xl pt-10'>{children}</div>
    </main>
  )
}
