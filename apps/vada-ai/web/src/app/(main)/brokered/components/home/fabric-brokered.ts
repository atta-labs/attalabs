import { createSplitFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'

export const renderBrokeredFabric: BgRenderer = createSplitFabricRenderer({
  approachSpeedMultiplier: 0.2,
  forceCompleteAtSphereEdge: true,
  shockWaveOnArrival: false
})
