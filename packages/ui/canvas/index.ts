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
// HarnessStructure), standalone — clamps onto its own canvas-drawn "main" hub.
export { HarnessRing } from './harness-ring'
// Herald's real brand logo (Sanity branding-herald), reused verbatim as `currentColor`
// SVG — the one sanctioned SVG mark in the AttaLabs hero. See herald-logo.tsx.
export { HeraldLogoMark } from './herald-logo'
// Vāda's real agent face illustrations, ported verbatim — the AttaLabs hero's second
// sanctioned SVG mark. See vada-face.tsx.
export { VadaFace, VadaFaceAdvocate, VadaFaceCritic } from './vada-face'
// Atta Engine's mark — plan nodes converging through a funnel into one execution node,
// with a slow gear ring behind it as texture. Canvas-drawn. See engine-mark.tsx.
export { EngineMark } from './engine-mark'
// Standalone fabric drivers (not using AIACanvas) must call this once per frame so
// isLightTheme() tracks html[data-theme]; AIACanvas calls it internally.
export { refreshThemeCache, isLightTheme } from './shared/theme'
