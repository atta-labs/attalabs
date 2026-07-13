/**
 * Pure types + classification for granular forge-availability reporting
 * (Issue #543). Replaces the single `forgeAvailable: boolean` signal — which
 * ANDed every slug's outcome together, so one transient `gh` failure among
 * six active iterations discarded all six — with a structured status that
 * distinguishes total outage from a partial, per-slug failure.
 *
 * No I/O here; `read-root.ts` is the caller that turns `Promise.allSettled`
 * results into the inputs this module classifies.
 */

/** `reason` is `Error.message` — for `console.warn`/tests only, never the UI
 *  (graceful-errors rule: raw error strings never reach a component). */
export type ForgeSlugFailure = { slug: string; reason: string }

export type ForgeStatus =
  | { kind: 'ok' }
  | { kind: 'partial'; failed: ForgeSlugFailure[]; total: number }
  | { kind: 'unreachable' }

/**
 * `enumerationFailed`: the slug-list call itself threw, or `resolveRepo()`
 * returned `null` — nothing to isolate per-slug, so `unreachable`.
 * Zero failures → `ok`. Some failures with survivors → `partial`. Every slug
 * failed → `unreachable` (indistinguishable from a dead forge in effect; the
 * caller still logs the individual failures via `console.warn` before this
 * reducer collapses them).
 */
export function reduceSettled(total: number, failures: ForgeSlugFailure[], enumerationFailed: boolean): ForgeStatus {
  if (enumerationFailed) return { kind: 'unreachable' }
  if (failures.length === 0) return { kind: 'ok' }
  if (failures.length >= total) return { kind: 'unreachable' }
  return { kind: 'partial', failed: failures, total }
}
