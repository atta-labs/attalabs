import type { ComponentType } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowRendererSet } from '../../types'
import {
  AGENT_NODE_WIDTH,
  AGENT_NODE_HEIGHT,
  SYNTHESIS_NODE_WIDTH,
  SYNTHESIS_NODE_HEIGHT
} from '../../planToVisualNodes'
import { SphereAgentNode } from './SphereAgentNode'
import { RingSynthesisNode } from './RingSynthesisNode'

export { SphereAgentNode, RingSynthesisNode }

export const canvasRenderers: FlowRendererSet = {
  agent: {
    component: SphereAgentNode as ComponentType<NodeProps>,
    bounds: { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT }
  },
  synthesis: {
    component: RingSynthesisNode as ComponentType<NodeProps>,
    bounds: { width: SYNTHESIS_NODE_WIDTH, height: SYNTHESIS_NODE_HEIGHT }
  }
}
