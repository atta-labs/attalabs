import type { Node, Edge } from '@xyflow/react'
import type { VisualizationOutput } from '../types'
import {
  AGENT_NODE_WIDTH,
  AGENT_NODE_HEIGHT,
  SYNTHESIS_NODE_HEIGHT,
  BRIEF_NODE_WIDTH,
  BRIEF_NODE_HEIGHT
} from '../planToVisualNodes'

const H_GAP = 80

// Solo layout: strict left-to-right linear. Brief → Agent → (Synthesis)
// Generous spacing communicates "this is small on purpose."
export function applySoloLayout(viz: VisualizationOutput): { nodes: Node[]; edges: Edge[] } {
  const { nodes, edges } = viz
  const positionedNodes = nodes.map((node) => {
    if (node.id === '__brief__') {
      return { ...node, position: { x: 0, y: 0 } }
    }
    if (node.type === 'synthesisNode') {
      return {
        ...node,
        position: {
          x: BRIEF_NODE_WIDTH + H_GAP + AGENT_NODE_WIDTH + H_GAP,
          y: (BRIEF_NODE_HEIGHT - SYNTHESIS_NODE_HEIGHT) / 2
        }
      }
    }
    // Agent node (solo agent)
    return {
      ...node,
      position: {
        x: BRIEF_NODE_WIDTH + H_GAP,
        y: (BRIEF_NODE_HEIGHT - AGENT_NODE_HEIGHT) / 2
      }
    }
  })

  return { nodes: positionedNodes, edges }
}
