import { AlertTriangle } from 'lucide-react'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'

/**
 * Shown when live forge enumeration failed or partially failed this request.
 * Makes the degradation visible instead of letting a failure render as a
 * truth-shaped empty list (D-087: Studio stores nothing, so it must not lie
 * by omission) — and, per Issue #543, granularly: a `partial` status names
 * the failed subset instead of collapsing one transient per-slug failure into
 * apparent total outage. The underlying `Error.message` stays in
 * `console.warn` — never surfaced here (graceful-errors rule); only a
 * human-readable failure category + the failed slug names reach the UI.
 * Renders nothing for `ok`. Mirrors Studio's existing warning banner
 * convention (see CoherencePanel).
 */
export function ForgeUnavailableBanner({
  scope,
  status
}: {
  scope: 'active' | 'archived' | 'both'
  status: ForgeStatus
}) {
  if (status.kind === 'ok') return null

  if (status.kind === 'unreachable') {
    return (
      <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
        <AlertTriangle className='size-4 shrink-0 translate-y-0.5 text-warning' aria-hidden />
        <p className='font-sans text-xs text-warning'>
          Live forge state unavailable — GitHub could not be reached. Showing archived/legacy data only; active
          iterations cannot be listed right now.
        </p>
      </div>
    )
  }

  const scopeLabel = scope === 'both' ? 'iterations' : `${scope} iterations`
  const slugList = status.failed.map((f) => f.slug).join(', ')
  return (
    <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
      <AlertTriangle className='size-4 shrink-0 translate-y-0.5 text-warning' aria-hidden />
      <p className='font-sans text-xs text-warning'>
        Live forge state partially unavailable — {status.failed.length} of {status.total} {scopeLabel} could not be
        loaded ({slugList}). Shown counts exclude them.
      </p>
    </div>
  )
}

/**
 * Composes the per-scope banners for a page holding both an active and an
 * archived list. When BOTH are `unreachable` (the same root-cause outage,
 * e.g. `resolveRepo()` failing) they collapse into one banner rather than two
 * duplicate "GitHub could not be reached" messages; otherwise each non-`ok`
 * scope renders its own banner.
 */
export function ForgeBanners({ forge }: { forge: { active: ForgeStatus; archived: ForgeStatus } }) {
  if (forge.active.kind === 'unreachable' && forge.archived.kind === 'unreachable') {
    return <ForgeUnavailableBanner scope='both' status={forge.active} />
  }
  return (
    <div className='space-y-2'>
      {forge.active.kind !== 'ok' && <ForgeUnavailableBanner scope='active' status={forge.active} />}
      {forge.archived.kind !== 'ok' && <ForgeUnavailableBanner scope='archived' status={forge.archived} />}
    </div>
  )
}
