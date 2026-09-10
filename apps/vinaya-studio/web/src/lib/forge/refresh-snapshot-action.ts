'use server'

/**
 * The tranche page's visible refresh action (task `vinaya-studio-shell-v1`
 * 1, #1053, O4). Bound to a `<form action={...}>` directly inside the
 * (Server Component) page — no client component needed. Does not await the
 * refresh itself: `forceRefresh` starts the background recompute and this
 * action returns immediately, so the button never blocks on the tens of
 * seconds a full forge re-derivation can take. `revalidatePath` still forces
 * Next to re-render the route on the action's own round trip; whether that
 * render sees fresh data depends on whether the background refresh has
 * finished by then — the store's stale-while-revalidate contract is "next
 * load sees it", not "this exact response sees it".
 */

import { revalidatePath } from 'next/cache'
import { forceRefresh } from './tranche-page-snapshot'

export async function refreshTrancheSnapshotAction(name: string, slug: string): Promise<void> {
  void forceRefresh(slug)
  revalidatePath(`/studio/projects/${encodeURIComponent(name)}/tranches/${encodeURIComponent(slug)}`)
}
