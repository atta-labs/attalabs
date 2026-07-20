import { createFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'

// Vinaya hero fabric: a single core sphere surfaces from the center, so the origin
// particles should decelerate smoothly into it (not snap at the edge) and land with a
// visible shock wave — the "surfacing" read. Same physics family as Vada's chooser page.
export const renderVinayaFabric: BgRenderer = createFabricRenderer({
  approachSpeedMultiplier: 0.8,
  forceCompleteAtSphereEdge: false,
  shockWaveOnArrival: true
})
