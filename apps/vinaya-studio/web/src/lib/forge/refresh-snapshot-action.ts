'use server'

/**
 * The tranche page's visible refresh action (task `vinaya-studio-shell-v1`
 * 1, #1053, O4). Bound to a `<form action={...}>` directly inside the
 * (Server Component) page — no client component needed. Does not await the
 * refresh itself: `forceRefresh` starts the background recompute and this
 * action returns immediately, so the button never blocks on the tens of
 * seconds a full forge re-derivation can take.
 *
 * `forceRefresh(slug)` is scheduled via `after()` (stable since Next 15,
 * this repo is on `^16.2.1`) rather than a bare `void`-called promise.
 * `after()` runs its callback once the response has finished, OUTSIDE the
 * action's own request lifecycle — a bare `void forceRefresh(slug)` looked
 * fire-and-forget but `revalidatePath` right below it still ties the
 * runtime's flush of that response to the same tick, so the detached
 * promise was empirically still holding the POST open for the full
 * ~13.7s derivation (found live, re-verified through an actual browser
 * click). `after()` is the documented way to hand Next a task that must
 * run detached from the response it was scheduled during.
 *
 * `revalidatePath` still forces Next to re-render the route on the action's
 * own round trip; whether that render sees fresh data depends on whether the
 * background refresh has finished by then — the store's
 * stale-while-revalidate contract is "next load sees it", not "this exact
 * response sees it".
 */

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { forceRefresh } from './tranche-page-snapshot'

export async function refreshTrancheSnapshotAction(name: string, slug: string): Promise<void> {
  after(() => forceRefresh(slug))
  revalidatePath(`/studio/projects/${encodeURIComponent(name)}/tranches/${encodeURIComponent(slug)}`)
}
