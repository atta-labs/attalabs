import { createSplitFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'

export const renderBrokeredFabric: BgRenderer = createSplitFabricRenderer({
  approachSpeedMultiplier: 1.5,
  forceCompleteAtSphereEdge: true,
  shockWaveOnArrival: false
})
