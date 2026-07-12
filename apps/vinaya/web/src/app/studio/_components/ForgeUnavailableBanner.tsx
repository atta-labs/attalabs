import { AlertTriangle } from 'lucide-react'

/**
 * Shown when live forge enumeration failed this request (`forgeAvailable ===
 * false`). Makes the degradation visible instead of letting a failure render
 * as a truth-shaped empty list (D-087: Studio stores nothing, so it must not
 * lie by omission). The underlying error stays in `console.warn` — never
 * surfaced here (graceful-errors rule). Mirrors Studio's existing warning
 * banner convention (see CoherencePanel).
 */
export function ForgeUnavailableBanner() {
  return (
    <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
      <AlertTriangle className='size-4 shrink-0 translate-y-0.5 text-warning' aria-hidden />
      <p className='font-sans text-xs text-warning'>
        Live forge state unavailable — GitHub could not be reached. Showing archived/legacy data only; active iterations
        cannot be listed right now.
      </p>
    </div>
  )
}
