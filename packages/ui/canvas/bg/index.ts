// packages/ui/canvas/bg/index.ts
export type { BgState, BgEvent, BgRenderer, BgVariant } from './types'
export { renderFabricBg, renderSplitFabricBg, resetFabricState } from './fabric'

import type { BgRenderer, BgVariant } from './types'
import { renderFabricBg, resetFabricState } from './fabric'

export const BG_RENDERERS: Record<BgVariant, BgRenderer | null> = {
  fabric: renderFabricBg,
  none: null
}

/**
 * Clears module-level mutable state across all bg renderers. Called from the
 * canvas mount effect so state doesn't carry over from a prior mount (browser
 * back, Fast Refresh, etc.) — which otherwise makes stale `startT`-keyed
 * effects produce negative radii and throw from `ctx.arc()`.
 */
export function resetBgState(): void {
  resetFabricState()
}
