import { createFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'

export const renderAutonomousFabric: BgRenderer = createFabricRenderer({
  approachSpeedMultiplier: 1.5,
  forceCompleteAtSphereEdge: true,
  shockWaveOnArrival: false
})
