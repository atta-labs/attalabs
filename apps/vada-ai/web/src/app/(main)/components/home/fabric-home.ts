import { createFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'

export const renderHomeFabric: BgRenderer = createFabricRenderer({
  approachSpeedMultiplier: 1,
  forceCompleteAtSphereEdge: false,
  shockWaveOnArrival: true
})
