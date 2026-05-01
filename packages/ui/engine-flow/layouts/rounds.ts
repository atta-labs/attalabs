import type { Node, Edge } from '@xyflow/react'
import type { VisualizationOutput } from '../types'
import {
  AGENT_NODE_WIDTH,
  AGENT_NODE_HEIGHT,
  SYNTHESIS_NODE_WIDTH,
  SYNTHESIS_NODE_HEIGHT,
  AUDIT_NODE_WIDTH,
  AUDIT_NODE_HEIGHT,
  BRIEF_NODE_WIDTH,
  BRIEF_NODE_HEIGHT,
  addRoundLabels,
  applyDagreLayout
} from '../planToVisualNodes'

const H_GAP = 60 // horizontal gap between agent columns within a round row
const BRIEF_GAP = 80 // brief right edge → first agent left edge
const SYNTH_AUDIT_GAP = 60 // last agent right edge → synthesizer left edge (post-rounds block)
const AUDIT_H_GAP = 24 // synthesizer right edge → first audit left edge
const ROW_V_GAP = 80 // gap from bottom of round row content to top of next round row
const POST_ROUNDS_V_GAP = 100 // gap from bottom of last round row to top of post-rounds block
const TOP_MARGIN = 56 // top of row 0 content (leaves room for round label above)

const MAX_ROW_H = Math.max(AGENT_NODE_HEIGHT, SYNTHESIS_NODE_HEIGHT)

// Rounds layout: serpentine — one round per horizontal row, rows stacked vertically.
// Each round row contains only N parallel agent nodes.
// A single post-rounds block sits below the last round: [synthesizer | audits]
// Brief anchors at left of row 0. Round labels float above each row.
// Cross-round edges (last agent of row R → all agents of row R+1) use smoothstep curves.
export function applyRoundsLayout(viz: VisualizationOutput): { nodes: Node[]; edges: Edge[] } {
  const { nodes, edges, rounds = [] } = viz

  if (rounds.length === 0) {
    const laidOut = applyDagreLayout(nodes, edges)
    return { nodes: laidOut, edges }
  }

  const positionMap = new Map<string, { x: number; y: number }>()

  // Align agent columns to the widest round so all rows share the same column spacing
  const maxAgents = Math.max(...rounds.map((r) => r.agentNodeIds.length), 1)
  const agentStartX = BRIEF_NODE_WIDTH + BRIEF_GAP

  // The post-rounds block starts after the widest possible round row
  const postRoundsX = agentStartX + (maxAgents - 1) * (AGENT_NODE_WIDTH + H_GAP) + AGENT_NODE_WIDTH + SYNTH_AUDIT_GAP
  const auditStartX = postRoundsX + SYNTHESIS_NODE_WIDTH + AUDIT_H_GAP

  // Position each round as a horizontal strip of parallel agent nodes
  rounds.forEach((round, rowIdx) => {
    const rowTopY = TOP_MARGIN + rowIdx * (MAX_ROW_H + ROW_V_GAP)
    const rowCenterY = rowTopY + MAX_ROW_H / 2

    round.agentNodeIds.forEach((id, colIdx) => {
      positionMap.set(id, {
        x: agentStartX + colIdx * (AGENT_NODE_WIDTH + H_GAP),
        y: rowCenterY - AGENT_NODE_HEIGHT / 2
      })
    })
  })

  // Brief node — vertically centered with row 0
  const row0CenterY = TOP_MARGIN + MAX_ROW_H / 2
  positionMap.set('__brief__', { x: 0, y: row0CenterY - BRIEF_NODE_HEIGHT / 2 })

  // Post-rounds block: synthesizer + audits, below the last round row
  const lastRowBottomY = TOP_MARGIN + (rounds.length - 1) * (MAX_ROW_H + ROW_V_GAP) + MAX_ROW_H
  const postRoundsTopY = lastRowBottomY + POST_ROUNDS_V_GAP
  const postRoundsCenterY = postRoundsTopY + SYNTHESIS_NODE_HEIGHT / 2

  // The last round carries synthNodeId and auditNodeIds for the post-rounds block
  const lastRound = rounds[rounds.length - 1]
  if (lastRound?.synthNodeId) {
    positionMap.set(lastRound.synthNodeId, {
      x: postRoundsX,
      y: postRoundsCenterY - SYNTHESIS_NODE_HEIGHT / 2
    })
  }

  if (lastRound) {
    lastRound.auditNodeIds.forEach((id, i) => {
      positionMap.set(id, {
        x: auditStartX + i * (AUDIT_NODE_WIDTH + AUDIT_H_GAP),
        y: postRoundsCenterY - AUDIT_NODE_HEIGHT / 2
      })
    })
  }

  // Any remaining nodes not yet positioned go below the post-rounds block
  const postRoundsBottomY = postRoundsTopY + SYNTHESIS_NODE_HEIGHT
  let overflowY = postRoundsBottomY + 40
  for (const n of nodes) {
    if (!positionMap.has(n.id) && n.type !== 'roundLabel') {
      positionMap.set(n.id, { x: postRoundsX, y: overflowY })
      overflowY += ((n.height as number | undefined) ?? AGENT_NODE_HEIGHT) + 24
    }
  }

  const positionedNodes = nodes.map((n) => {
    const pos = positionMap.get(n.id)
    return pos ? { ...n, position: pos } : n
  })

  const withLabels = addRoundLabels(positionedNodes, rounds)

  // Cross-round edges: from last-agent-of-round-R to agents-of-round-R+1 use smoothstep curves
  const crossRoundSources = new Set<string>()
  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const currentRound = rounds[ri]!
    const lastAgent = currentRound.agentNodeIds[currentRound.agentNodeIds.length - 1]
    if (lastAgent) crossRoundSources.add(lastAgent)
  }

  // Also mark the last-round-to-synthesizer edge as smoothstep
  const lastRoundLastAgent = lastRound?.agentNodeIds[lastRound.agentNodeIds.length - 1]
  if (lastRoundLastAgent) crossRoundSources.add(lastRoundLastAgent)

  const styledEdges = edges.map((e) => {
    return crossRoundSources.has(e.source) ? { ...e, type: 'smoothstep' } : e
  })

  return { nodes: withLabels, edges: styledEdges }
}
