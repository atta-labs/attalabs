import type { ComponentType } from 'react'
import type { Node, Edge, NodeProps } from '@xyflow/react'
import type { PlanNodeRole } from '@atta/engine'

export type NodeVisualState = 'idle' | 'queued' | 'running' | 'streaming' | 'complete' | 'revised'
export type WorkflowType = 'solo' | 'brokered' | 'rounds' | 'custom'

export interface AgentNodeData {
  label: string
  agentName: string
  role: PlanNodeRole
  roundIndex?: number
  visualState: NodeVisualState
  streamingContent?: string
  model?: string
  colorIndex?: number
  [key: string]: unknown
}

export interface SynthesisNodeData {
  label: string
  agentName: string
  visualState: NodeVisualState
  streamingContent?: string
  model?: string
  isRoundSynth?: boolean
  colorIndex?: number
  [key: string]: unknown
}

export interface AuditNodeData {
  label: string
  agentName: string
  roundIndex?: number
  visualState: NodeVisualState
  [key: string]: unknown
}

export interface BriefNodeData {
  label: string
  visualState: NodeVisualState
  [key: string]: unknown
}

export interface RoundLabelData {
  round: number
  label: string
  isActive?: boolean
  [key: string]: unknown
}

export interface FlowNodeRenderer {
  component: ComponentType<NodeProps>
  bounds: { width: number; height: number }
}

export interface FlowRendererSet {
  agent?: FlowNodeRenderer
  synthesis?: FlowNodeRenderer
  audit?: FlowNodeRenderer
  brief?: FlowNodeRenderer
}

export interface RoundMeta {
  id: number
  agentNodeIds: string[]
  synthNodeId?: string
  auditNodeIds: string[]
}

export interface VisualizationOutput {
  workflowType: WorkflowType
  nodes: Node[]
  edges: Edge[]
  rounds: RoundMeta[]
  hasSynthesis: boolean
}
