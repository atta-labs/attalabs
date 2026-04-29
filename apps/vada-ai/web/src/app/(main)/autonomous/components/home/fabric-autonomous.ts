import { createFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'

export const renderAutonomousFabric: BgRenderer = createFabricRenderer({
  approachSpeedMultiplier: 1,
  forceCompleteAtSphereEdge: true,
  shockWaveOnArrival: true,
  gravityMultiplier: 0,
  waterWave: true
})
