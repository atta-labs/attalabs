export { AIACanvas, type AIACanvasRef } from './aia-canvas'
export { AIAgent, type AIAgentProps } from './aia-agent'
export { AIASphere } from './aia-sphere'
export { useAIASphere } from './useAIASphere'
export { AIARing } from './aia-ring'
export { useAIAContext, type AIAContextValue, type CanvasPhase, type SphereState } from './aia-context'
export type { BgVariant, BgRenderer, BgState, BgEvent, FabricConfig } from './bg'
export { renderFabricBg, renderSplitFabricBg, createFabricRenderer, createSplitFabricRenderer } from './bg'
// Standalone fabric drivers (not using AIACanvas) must call this once per frame so
// isLightTheme() tracks html[data-theme]; AIACanvas calls it internally.
export { refreshThemeCache, isLightTheme } from './shared/theme'
