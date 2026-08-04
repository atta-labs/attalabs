export { AIACanvas, type AIACanvasRef } from './aia-canvas'
export { AIAgent, type AIAgentProps } from './aia-agent'
export { AIASphere } from './aia-sphere'
export { useAIASphere } from './useAIASphere'
export { AIARing } from './aia-ring'
export { useAIAContext, type AIAContextValue, type CanvasPhase, type SphereState } from './aia-context'
export type { BgVariant, BgRenderer, BgState, BgEvent, FabricConfig } from './bg'
export { renderFabricBg, renderSplitFabricBg, createFabricRenderer, createSplitFabricRenderer } from './bg'
// A local, contained fabric-mesh canvas (not full-viewport like AIACanvas) — for a
// hero section that scrolls with the page, or a compact node mark. Moved here from
// apps/vinaya/web (its original, still-only, consumer) — zero code changes, it was
// already written with only @atta/ui/canvas imports.
export { HeroFabric } from './hero-fabric'
// Vinaya's mark — canvas-drawn harness ring (ported from apps/vinaya/web's SVG
// HarnessStructure). Encloses a cluster via `clusterRadius`, not a single node.
export { HarnessRing } from './harness-ring'
// Herald's mark — a single-stroke flag silhouette inside a sphere shell. Canvas-drawn.
export { HeraldFlag } from './herald-flag'
// Engine's mark — a single-stroke 13-tooth gear silhouette. Canvas-drawn.
export { EngineGear } from './engine-gear'
// Standalone fabric drivers (not using AIACanvas) must call this once per frame so
// isLightTheme() tracks html[data-theme]; AIACanvas calls it internally.
export { refreshThemeCache, isLightTheme } from './shared/theme'
