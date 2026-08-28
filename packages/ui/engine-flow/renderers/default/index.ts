import type { ComponentType } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowRendererSet } from '../../types'
import {
  AGENT_NODE_WIDTH,
  AGENT_NODE_HEIGHT,
  SYNTHESIS_NODE_WIDTH,
  SYNTHESIS_NODE_HEIGHT,
  BRIEF_NODE_WIDTH,
  BRIEF_NODE_HEIGHT,
  AUDIT_NODE_WIDTH,
  AUDIT_NODE_HEIGHT,
  AGENT_SPAWN_NODE_WIDTH,
  AGENT_SPAWN_NODE_HEIGHT,
  MECHANICAL_NODE_WIDTH,
  MECHANICAL_NODE_HEIGHT
} from '../../planToVisualNodes'
import { AgentNode } from '../../nodeRenderers/AgentNode'
import { SynthesisNode } from '../../nodeRenderers/SynthesisNode'
import { BriefNode } from '../../nodeRenderers/BriefNode'
import { AuditBadge } from '../../nodeRenderers/AuditBadge'
import { AgentSpawnNode } from '../../nodeRenderers/AgentSpawnNode'
import { MechanicalNode } from '../../nodeRenderers/MechanicalNode'

export const defaultRenderers: FlowRendererSet = {
  agent: {
    component: AgentNode as ComponentType<NodeProps>,
    bounds: { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT }
  },
  synthesis: {
    component: SynthesisNode as ComponentType<NodeProps>,
    bounds: { width: SYNTHESIS_NODE_WIDTH, height: SYNTHESIS_NODE_HEIGHT }
  },
  brief: {
    component: BriefNode as ComponentType<NodeProps>,
    bounds: { width: BRIEF_NODE_WIDTH, height: BRIEF_NODE_HEIGHT }
  },
  audit: {
    component: AuditBadge as ComponentType<NodeProps>,
    bounds: { width: AUDIT_NODE_WIDTH, height: AUDIT_NODE_HEIGHT }
  },
  agentSpawn: {
    component: AgentSpawnNode as ComponentType<NodeProps>,
    bounds: { width: AGENT_SPAWN_NODE_WIDTH, height: AGENT_SPAWN_NODE_HEIGHT }
  },
  mechanical: {
    component: MechanicalNode as ComponentType<NodeProps>,
    bounds: { width: MECHANICAL_NODE_WIDTH, height: MECHANICAL_NODE_HEIGHT }
  }
}
