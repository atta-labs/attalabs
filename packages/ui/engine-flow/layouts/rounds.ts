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
const AUDIT_H_GAP = 24 // gap between audit nodes in the centered block below synth
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

  // Synth centered horizontally under the agent columns
  const agentColumnsWidth = maxAgents * AGENT_NODE_WIDTH + (maxAgents - 1) * H_GAP
  const agentColumnsCenterX = agentStartX + agentColumnsWidth / 2
  const synthX = agentColumnsCenterX - SYNTHESIS_NODE_WIDTH / 2

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

  // Post-rounds block: synthesizer centered below agents, audits stacked below synth
  const lastRowBottomY = TOP_MARGIN + (rounds.length - 1) * (MAX_ROW_H + ROW_V_GAP) + MAX_ROW_H
  const synthTopY = lastRowBottomY + POST_ROUNDS_V_GAP
  const auditTopY = synthTopY + SYNTHESIS_NODE_HEIGHT + 60 // 60px gap below synth

  // The last round carries synthNodeId and auditNodeIds for the post-rounds block
  const lastRound = rounds[rounds.length - 1]
  if (lastRound?.synthNodeId) {
    positionMap.set(lastRound.synthNodeId, {
      x: synthX,
      y: synthTopY
    })
  }

  if (lastRound && lastRound.auditNodeIds.length > 0) {
    const auditBlockWidth =
      lastRound.auditNodeIds.length * AUDIT_NODE_WIDTH + (lastRound.auditNodeIds.length - 1) * AUDIT_H_GAP
    const auditStartX = agentColumnsCenterX - auditBlockWidth / 2
    const auditCenterY = auditTopY + AUDIT_NODE_HEIGHT / 2

    lastRound.auditNodeIds.forEach((id, i) => {
      positionMap.set(id, {
        x: auditStartX + i * (AUDIT_NODE_WIDTH + AUDIT_H_GAP),
        y: auditCenterY - AUDIT_NODE_HEIGHT / 2
      })
    })
  }

  // Any remaining nodes not yet positioned go below the post-rounds block
  const overflowBaseY = auditTopY + AUDIT_NODE_HEIGHT + 40
  let overflowY = overflowBaseY
  for (const n of nodes) {
    if (!positionMap.has(n.id) && n.type !== 'roundLabel') {
      positionMap.set(n.id, { x: synthX, y: overflowY })
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

  // All last-round agents fan into synthesis below — all use smoothstep
  if (lastRound) {
    for (const agentId of lastRound.agentNodeIds) {
      crossRoundSources.add(agentId)
    }
  }

  const styledEdges = edges.map((e) => {
    return crossRoundSources.has(e.source) ? { ...e, type: 'smoothstep' } : e
  })

  return { nodes: withLabels, edges: styledEdges }
}
