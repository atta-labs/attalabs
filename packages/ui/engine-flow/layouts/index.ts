import type { Node, Edge } from '@xyflow/react'
import type { VisualizationOutput } from '../types'
import { applySoloLayout } from './solo'
import { applyBrokeredLayout } from './brokered'
import { applyRoundsLayout } from './rounds'
import { applyCustomLayout } from './custom'

export function applyLayout(viz: VisualizationOutput): { nodes: Node[]; edges: Edge[] } {
  switch (viz.workflowType) {
    case 'solo':
      return applySoloLayout(viz)
    case 'brokered':
      return applyBrokeredLayout(viz)
    case 'rounds':
      return applyRoundsLayout(viz)
    default:
      return applyCustomLayout(viz)
  }
}
