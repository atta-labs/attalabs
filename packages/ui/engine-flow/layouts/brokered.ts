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
const V_GAP = 32

// Brokered layout: parallel reviewer lanes — all reviewers at the same X, synthesis at far right.
// Visually communicates "these are independent parallel voices, not sequential".
export function applyBrokeredLayout(viz: VisualizationOutput): { nodes: Node[]; edges: Edge[] } {
  const { nodes, edges, hasSynthesis } = viz

  const reviewerNodes = nodes.filter((n) => n.id.startsWith('reviewer-'))
  const reviewerCount = reviewerNodes.length
  const totalReviewerHeight = reviewerCount * AGENT_NODE_HEIGHT + (reviewerCount - 1) * V_GAP
  const centerY = totalReviewerHeight / 2

  const positionedNodes = nodes.map((node) => {
    if (node.id === '__brief__') {
      return {
        ...node,
        position: { x: 0, y: centerY - BRIEF_NODE_HEIGHT / 2 }
      }
    }

    if (node.id.startsWith('reviewer-')) {
      const idx = reviewerNodes.findIndex((r) => r.id === node.id)
      return {
        ...node,
        position: {
          x: BRIEF_NODE_WIDTH + H_GAP,
          y: idx * (AGENT_NODE_HEIGHT + V_GAP)
        }
      }
    }

    if (node.type === 'synthesisNode' && hasSynthesis) {
      return {
        ...node,
        position: {
          x: BRIEF_NODE_WIDTH + H_GAP + AGENT_NODE_WIDTH + H_GAP,
          y: centerY - SYNTHESIS_NODE_HEIGHT / 2
        }
      }
    }

    return node
  })

  // Keep only the edges we built (brief→reviewers, reviewers→synth) — already in viz.edges
  return { nodes: positionedNodes, edges }
}
