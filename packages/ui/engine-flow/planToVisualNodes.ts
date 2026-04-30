import Dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'
import type { Plan, PlanNodeRole } from '@atta/engine'
import type { NodeVisualState } from './events'

export interface AgentNodeData {
  label: string
  agentName: string
  role: PlanNodeRole
  roundIndex?: number
  visualState: NodeVisualState
  streamingContent?: string
  [key: string]: unknown
}

export interface SynthesisNodeData {
  label: string
  agentName: string
  visualState: NodeVisualState
  streamingContent?: string
  [key: string]: unknown
}

export interface RoundLabelData {
  round: number
  label: string
  [key: string]: unknown
}

const AGENT_NODE_WIDTH = 220
const AGENT_NODE_HEIGHT = 88
const SYNTHESIS_NODE_WIDTH = 240
const SYNTHESIS_NODE_HEIGHT = 96
const ROUND_LABEL_WIDTH = 140
const ROUND_LABEL_HEIGHT = 32

function nodeTypeForRole(role: PlanNodeRole): 'agentNode' | 'synthesisNode' {
  return role === 'terminal' ? 'synthesisNode' : 'agentNode'
}

function nodeDimensions(type: 'agentNode' | 'synthesisNode') {
  return type === 'synthesisNode'
    ? { width: SYNTHESIS_NODE_WIDTH, height: SYNTHESIS_NODE_HEIGHT }
    : { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT }
}

// Dagre TB layout — simple API, sufficient for all 7 YAML shapes.
// ELK was considered but Dagre handles the plan graph sizes (≤30 nodes) well.
function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 90, marginx: 20, marginy: 20 })

  for (const node of nodes) {
    if (node.type === 'roundLabel') continue // positioned manually after layout
    const { width, height } = node.measured ?? { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT }
    g.setNode(node.id, { width, height })
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  Dagre.layout(g)

  return nodes.map((node) => {
    if (node.type === 'roundLabel') return node
    const pos = g.node(node.id)
    const { width, height } = nodeDimensions(node.type === 'synthesisNode' ? 'synthesisNode' : 'agentNode')
    return { ...node, position: { x: pos.x - width / 2, y: pos.y - height / 2 } }
  })
}

export function planToVisualNodes(plan: Plan): { nodes: Node[]; edges: Edge[] } {
  const planNodes = Object.values(plan.graph.nodes)

  // Determine which node IDs are part of round groups (role='round')
  const roundGroups = new Map<number, string[]>() // roundIndex → nodeIds
  for (const pNode of planNodes) {
    const ri = pNode.metadata.roundIndex
    if (pNode.role === 'round' && ri !== undefined) {
      const group = roundGroups.get(ri) ?? []
      group.push(pNode.id)
      roundGroups.set(ri, group)
    }
  }

  // Build React Flow nodes from plan nodes
  const rfNodes: Node[] = planNodes.map((pNode) => {
    const type = nodeTypeForRole(pNode.role)
    const dim = nodeDimensions(type)
    const agentDef = plan.agents[pNode.agentName]
    const modelLabel = agentDef?.model ?? plan.model

    if (type === 'synthesisNode') {
      return {
        id: pNode.id,
        type,
        position: { x: 0, y: 0 },
        data: {
          label: pNode.agentName,
          agentName: pNode.agentName,
          model: modelLabel,
          visualState: 'idle' as NodeVisualState
        } satisfies SynthesisNodeData,
        ...dim
      }
    }

    return {
      id: pNode.id,
      type,
      position: { x: 0, y: 0 },
      data: {
        label: pNode.agentName,
        agentName: pNode.agentName,
        role: pNode.role,
        roundIndex: pNode.metadata.roundIndex,
        model: modelLabel,
        visualState: 'idle' as NodeVisualState
      } satisfies AgentNodeData,
      ...dim
    }
  })

  // Build edges: unconditional edges as solid animated, conditional as dashed
  const rfEdges: Edge[] = []

  for (const edge of plan.graph.edges) {
    rfEdges.push({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: false,
      style: { stroke: 'var(--border)', strokeWidth: 1.5 }
    })
  }

  for (const ce of plan.graph.conditionalEdges) {
    // Show both ifTrue and ifFalse branches; ifFalse is the normal path
    rfEdges.push({
      id: `${ce.from}-true-${ce.ifTrue}`,
      source: ce.from,
      target: ce.ifTrue,
      animated: false,
      style: { stroke: 'var(--warning)', strokeWidth: 1.5, strokeDasharray: '5,4' },
      label: 'if flagged',
      labelStyle: { fontSize: 10, fill: 'var(--muted-foreground)' }
    })
    if (ce.ifFalse !== '__END__') {
      rfEdges.push({
        id: `${ce.from}-false-${ce.ifFalse}`,
        source: ce.from,
        target: ce.ifFalse,
        animated: false,
        style: { stroke: 'var(--border)', strokeWidth: 1.5 },
        label: 'if clean',
        labelStyle: { fontSize: 10, fill: 'var(--muted-foreground)' }
      })
    }
  }

  // Apply Dagre layout to get real positions
  const laidOutNodes = applyDagreLayout(rfNodes, rfEdges)

  // Add round label nodes above each round group (manual positioning post-Dagre)
  const finalNodes = [...laidOutNodes]

  if (roundGroups.size > 1) {
    for (const [roundIndex, nodeIds] of roundGroups) {
      const groupNodes = laidOutNodes.filter((n) => nodeIds.includes(n.id))
      if (groupNodes.length === 0) continue

      const minY = Math.min(...groupNodes.map((n) => n.position.y))
      const avgX = groupNodes.reduce((sum, n) => sum + n.position.x, 0) / groupNodes.length

      finalNodes.push({
        id: `round-label-${roundIndex}`,
        type: 'roundLabel',
        position: { x: avgX - ROUND_LABEL_WIDTH / 2, y: minY - 50 },
        data: { round: roundIndex, label: `Round ${roundIndex + 1}` } satisfies RoundLabelData,
        width: ROUND_LABEL_WIDTH,
        height: ROUND_LABEL_HEIGHT,
        selectable: false,
        draggable: false
      })
    }
  }

  return { nodes: finalNodes, edges: rfEdges }
}
