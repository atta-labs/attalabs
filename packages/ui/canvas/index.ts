export { AIACanvas, type AIACanvasRef } from './aia-canvas'
export { AIAgent, type FaceStyle } from './aia-agent'
export {
  AGENTS,
  AGENT_LIST,
  AGENT_THEME,
  AGENT_COLOR_BY_ROLE,
  AGENT_SPHERE_COLORS,
  type AgentName,
  type AgentRole,
  type AgentDef
} from '@atta/agents'
export { AIASphere } from './aia-sphere'
export { useAIASphere } from './useAIASphere'
export { AIARing } from './aia-ring'
export { useAIAContext, type AIAContextValue, type CanvasPhase } from './aia-context'
export type { BgVariant, BgRenderer, BgState, BgEvent } from './bg'
export {
  AGENT_FACES,
  StrategistFace,
  CriticFace,
  DevilsAdvocateFace,
  SynthesizerFace,
  ResearcherFace,
  OperatorFace
} from './agent-faces'
export {
  AGENT_FACES as AGENT_FACES_MINIMAL,
  StrategistFace as StrategistFaceMinimal,
  CriticFace as CriticFaceMinimal,
  DevilsAdvocateFace as DevilsAdvocateFaceMinimal,
  SynthesizerFace as SynthesizerFaceMinimal,
  ResearcherFace as ResearcherFaceMinimal,
  OperatorFace as OperatorFaceMinimal
} from './agent-faces-minimal'
export {
  AGENT_FACES as AGENT_FACES_FULL,
  StrategistFace as StrategistFaceFull,
  CriticFace as CriticFaceFull,
  DevilsAdvocateFace as DevilsAdvocateFaceFull,
  SynthesizerFace as SynthesizerFaceFull,
  ResearcherFace as ResearcherFaceFull,
  OperatorFace as OperatorFaceFull
} from './agent-faces-full'
