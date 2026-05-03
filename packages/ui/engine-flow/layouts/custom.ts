import type { Node, Edge } from '@xyflow/react'
import type { VisualizationOutput } from '../types'
import { applyDagreLayout } from '../planToVisualNodes'

// Custom layout: Dagre LR fallback for custom-step workflows.
export function applyCustomLayout(viz: VisualizationOutput): { nodes: Node[]; edges: Edge[] } {
  const laidOut = applyDagreLayout(viz.nodes, viz.edges)
  return { nodes: laidOut, edges: viz.edges }
}
