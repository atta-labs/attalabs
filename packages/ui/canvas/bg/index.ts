// packages/ui/canvas/bg/index.ts
export type { BgState, BgEvent, BgRenderer, BgVariant } from './types'
export { renderFabricBg } from './fabric'

import type { BgRenderer, BgVariant } from './types'
import { renderFabricBg } from './fabric'

export const BG_RENDERERS: Record<BgVariant, BgRenderer | null> = {
  fabric: renderFabricBg,
  none: null
}
