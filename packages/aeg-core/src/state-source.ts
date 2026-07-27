import type { Tranche } from './types'

/**
 * The seam the pure evaluators (`deriveTranche`, `sumLedger`, ...) consume
 * state through, instead of a raw `Tranche` tied to one storage shape.
 * Implementations (forge-backed, file-backed) perform I/O and therefore live
 * outside `aeg-core` (`apps/vinaya/sources`) — this package only defines the
 * contract. Async on both adapters, even though the file adapter's own read
 * is sync-capable, so callers get one uniform type regardless of which
 * adapter is selected.
 */
export type StateSource = {
  getTranche(slug: string): Promise<Tranche>
}
