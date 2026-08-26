import type { ReactNode } from 'react'

/** Stripped to a plain pass-through — the old two-part `StartSidebarHost`
 * nav it used to render is deleted along with the seven per-stage routes it
 * pointed at (Issue #918: their content now lives at `/life-cycle`). Kept
 * as a file, not deleted: `/start` and `/start/quick` still route through
 * it, and Issue #920 (not yet dispatched) rebuilds this shell properly for
 * just the quickstart wizard once it lands. */
export default function StartLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
