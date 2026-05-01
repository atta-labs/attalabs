import Dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'
import type { Plan, PlanNode } from '@atta/engine'
import type {
  AgentNodeData,
  SynthesisNodeData,
  AuditNodeData,
  BriefNodeData,
  RoundLabelData,
  RoundMeta,
  VisualizationOutput,
  WorkflowType
} from './types'

export type { AgentNodeData, SynthesisNodeData, AuditNodeData, BriefNodeData, RoundLabelData }

// Layout dimension constants — used by layout strategies and exported for renderer alignment
export const AGENT_NODE_WIDTH = 220
export const AGENT_NODE_HEIGHT = 88
export const SYNTHESIS_NODE_WIDTH = 240
export const SYNTHESIS_NODE_HEIGHT = 96
export const AUDIT_NODE_WIDTH = 200
export const AUDIT_NODE_HEIGHT = 52
export const BRIEF_NODE_WIDTH = 140
export const BRIEF_NODE_HEIGHT = 52
export const ROUND_LABEL_WIDTH = 140
export const ROUND_LABEL_HEIGHT = 32

function nodeDimensionsForType(type: string): { width: number; height: number } {
  if (type === 'synthesisNode') return { width: SYNTHESIS_NODE_WIDTH, height: SYNTHESIS_NODE_HEIGHT }
  if (type === 'auditNode') return { width: AUDIT_NODE_WIDTH, height: AUDIT_NODE_HEIGHT }
  if (type === 'briefNode') return { width: BRIEF_NODE_WIDTH, height: BRIEF_NODE_HEIGHT }
  return { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT }
}

function inferWorkflowType(planNodes: PlanNode[]): WorkflowType {
  if (planNodes.some((n) => n.kind === 'parallel-peer' && n.metadata.roundIndex !== undefined)) return 'rounds'
  if (planNodes.some((n) => n.kind === 'custom-step')) return 'custom'
  if (planNodes.some((n) => n.id.startsWith('reviewer-'))) return 'brokered'
  return 'solo'
}

// Assign a stable color index per unique agent name (for canvas renderers)
function buildColorIndexMap(planNodes: PlanNode[]): Map<string, number> {
  const map = new Map<string, number>()
  let counter = 0
  for (const n of planNodes) {
    if (!map.has(n.agentName)) {
      map.set(n.agentName, counter++)
    }
  }
  return map
}

export function planToVisualNodes(plan: Plan): VisualizationOutput {
  // Filter sentinel and revision-terminal nodes — they are graph infrastructure, not render targets
  const allPlanNodes = Object.values(plan.graph.nodes)
  const renderableNodes = allPlanNodes.filter(
    (n) =>
      n.kind !== 'system-sentinel' &&
      n.kind !== 'revision-terminal' &&
      !(n.kind === 'auditor' && (n.metadata.revisionIndex ?? 0) > 0)
  )

  const workflowType = inferWorkflowType(renderableNodes)
  const colorIndexMap = buildColorIndexMap(renderableNodes)

  // Build round metadata from kind + metadata.roundIndex — NOT from edge topology
  const rounds: RoundMeta[] = []
  if (workflowType === 'rounds') {
    const roundGroups = new Map<number, string[]>()
    for (const n of renderableNodes) {
      if (n.kind === 'parallel-peer' && n.metadata.roundIndex !== undefined) {
        const group = roundGroups.get(n.metadata.roundIndex) ?? []
        group.push(n.id)
        roundGroups.set(n.metadata.roundIndex, group)
      }
    }

    // The synthesizer (terminal-0) and auditors are post-rounds, not per-round
    const synthNode = renderableNodes.find((n) => n.kind === 'synthesizer')
    const auditNodes = renderableNodes.filter((n) => n.kind === 'auditor')

    // Collapse audit slots: show one auditor node per unique agent name (slot 0 only)
    const seenAuditAgents = new Set<string>()
    const deduplicatedAuditIds: string[] = []
    for (const n of auditNodes) {
      if (!seenAuditAgents.has(n.agentName)) {
        seenAuditAgents.add(n.agentName)
        deduplicatedAuditIds.push(n.id)
      }
    }

    const sortedRoundIndexes = [...roundGroups.keys()].sort((a, b) => a - b)
    for (const ri of sortedRoundIndexes) {
      const agentNodeIds = roundGroups.get(ri) ?? []
      // synthNodeId and auditNodeIds only on the last round (post-rounds block)
      const isLastRound = ri === sortedRoundIndexes[sortedRoundIndexes.length - 1]
      rounds.push({
        id: ri,
        agentNodeIds,
        synthNodeId: isLastRound ? synthNode?.id : undefined,
        auditNodeIds: isLastRound ? deduplicatedAuditIds : []
      })
    }
  }

  const hasSynthesis = renderableNodes.some((n) => n.kind === 'synthesizer')

  // Build React Flow nodes (positions at origin — layout strategies apply positions)
  const rfNodes: Node[] = []

  // Virtual brief node (entry point visual)
  rfNodes.push({
    id: '__brief__',
    type: 'briefNode',
    position: { x: 0, y: 0 },
    data: { label: 'Brief', visualState: 'idle' } satisfies BriefNodeData,
    ...nodeDimensionsForType('briefNode')
  })

  // Plan nodes — use kind for React Flow node type classification
  for (const pNode of renderableNodes) {
    const rfType = nodeKindToRfType(pNode)
    const dim = nodeDimensionsForType(rfType)
    const agentDef = plan.agents[pNode.agentName]
    const modelLabel = agentDef?.model ?? plan.model
    const colorIndex = colorIndexMap.get(pNode.agentName) ?? 0

    if (rfType === 'synthesisNode') {
      rfNodes.push({
        id: pNode.id,
        type: rfType,
        position: { x: 0, y: 0 },
        data: {
          label: pNode.agentName,
          agentName: pNode.agentName,
          model: modelLabel,
          isRoundSynth: false,
          colorIndex,
          visualState: 'idle'
        } satisfies SynthesisNodeData,
        ...dim
      })
    } else if (rfType === 'auditNode') {
      rfNodes.push({
        id: pNode.id,
        type: rfType,
        position: { x: 0, y: 0 },
        data: {
          label: pNode.agentName,
          agentName: pNode.agentName,
          roundIndex: pNode.metadata.roundIndex,
          visualState: 'idle'
        } satisfies AuditNodeData,
        ...dim
      })
    } else {
      rfNodes.push({
        id: pNode.id,
        type: rfType,
        position: { x: 0, y: 0 },
        data: {
          label: pNode.agentName,
          agentName: pNode.agentName,
          role: pNode.role,
          roundIndex: pNode.metadata.roundIndex,
          model: modelLabel,
          colorIndex,
          visualState: 'idle'
        } satisfies AgentNodeData,
        ...dim
      })
    }
  }

  // Build edges — skip edges that connect to/from filtered nodes
  const renderableIds = new Set(renderableNodes.map((n) => n.id))
  renderableIds.add('__brief__')

  const rfEdges: Edge[] = []

  if (workflowType === 'brokered') {
    // Replace sequential reviewer→reviewer ordering edges with parallel fan-out from brief
    const reviewerNodes = renderableNodes.filter((n) => n.id.startsWith('reviewer-'))
    const synthNode = renderableNodes.find((n) => n.kind === 'synthesizer')

    for (const reviewer of reviewerNodes) {
      rfEdges.push({
        id: `__brief__-${reviewer.id}`,
        source: '__brief__',
        target: reviewer.id,
        animated: false,
        style: { stroke: 'var(--border)', strokeWidth: 1.5 }
      })
      if (synthNode) {
        rfEdges.push({
          id: `${reviewer.id}-${synthNode.id}`,
          source: reviewer.id,
          target: synthNode.id,
          animated: false,
          style: { stroke: 'var(--border)', strokeWidth: 1.5 }
        })
      }
    }
  } else if (workflowType === 'rounds') {
    // Brief → all round-0 parallel peers
    const round0Ids = rounds[0]?.agentNodeIds ?? []
    for (const agentId of round0Ids) {
      rfEdges.push({
        id: `__brief__-${agentId}`,
        source: '__brief__',
        target: agentId,
        animated: false,
        style: { stroke: 'var(--border)', strokeWidth: 1.5 }
      })
    }

    // Render all plan edges; ordering edges (LangGraph wiring) get a dashed/dimmed style
    for (const edge of plan.graph.edges) {
      if (!renderableIds.has(edge.from) || !renderableIds.has(edge.to)) continue
      const isOrdering = edge.kind === 'ordering'
      rfEdges.push({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        animated: false,
        style: isOrdering
          ? { stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4,4', opacity: 0.45 }
          : { stroke: 'var(--border)', strokeWidth: 1.5 }
      })
    }

    // Add cross-round fan-out edges: last agent of round R → all agents of round R+1.
    // Skip IDs already emitted by the plan.graph.edges loop above (ordering edges covering
    // the same connection would otherwise produce duplicate React Flow keys).
    const emittedEdgeIds = new Set(rfEdges.map((e) => e.id))
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const currentRound = rounds[ri]!
      const nextRound = rounds[ri + 1]!
      const lastAgentOfCurrentRound = currentRound.agentNodeIds[currentRound.agentNodeIds.length - 1]
      if (!lastAgentOfCurrentRound) continue
      for (const nextAgentId of nextRound.agentNodeIds) {
        const edgeId = `${lastAgentOfCurrentRound}-${nextAgentId}`
        if (emittedEdgeIds.has(edgeId)) continue
        emittedEdgeIds.add(edgeId)
        rfEdges.push({
          id: edgeId,
          source: lastAgentOfCurrentRound,
          target: nextAgentId,
          animated: false,
          style: { stroke: 'var(--border)', strokeWidth: 1.5 }
        })
      }
    }

    // Conditional edges (audit → revision path) — skip targets that are non-renderable
    for (const ce of plan.graph.conditionalEdges) {
      if (!renderableIds.has(ce.from)) continue
      if (renderableIds.has(ce.ifTrue)) {
        rfEdges.push({
          id: `${ce.from}-true-${ce.ifTrue}`,
          source: ce.from,
          target: ce.ifTrue,
          animated: false,
          style: { stroke: 'var(--warning)', strokeWidth: 1.5, strokeDasharray: '5,4' },
          label: 'if flagged',
          labelStyle: { fontSize: 10, fill: 'var(--muted-foreground)' }
        })
      }
      if (ce.ifFalse !== '__END__' && renderableIds.has(ce.ifFalse)) {
        rfEdges.push({
          id: `${ce.from}-false-${ce.ifFalse}`,
          source: ce.from,
          target: ce.ifFalse,
          animated: false,
          style: { stroke: 'var(--border)', strokeWidth: 1.5 }
        })
      }
    }
  } else {
    // Solo, custom: brief → entry node + all plan edges (all are flow edges)
    rfEdges.push({
      id: `__brief__-${plan.graph.entryNode}`,
      source: '__brief__',
      target: plan.graph.entryNode,
      animated: false,
      style: { stroke: 'var(--border)', strokeWidth: 1.5 }
    })
    for (const edge of plan.graph.edges) {
      if (!renderableIds.has(edge.from) || !renderableIds.has(edge.to)) continue
      rfEdges.push({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        animated: false,
        style: { stroke: 'var(--border)', strokeWidth: 1.5 }
      })
    }
    for (const ce of plan.graph.conditionalEdges) {
      if (!renderableIds.has(ce.from)) continue
      if (renderableIds.has(ce.ifTrue)) {
        rfEdges.push({
          id: `${ce.from}-true-${ce.ifTrue}`,
          source: ce.from,
          target: ce.ifTrue,
          animated: false,
          style: { stroke: 'var(--warning)', strokeWidth: 1.5, strokeDasharray: '5,4' },
          label: 'if flagged',
          labelStyle: { fontSize: 10, fill: 'var(--muted-foreground)' }
        })
      }
      if (ce.ifFalse !== '__END__' && renderableIds.has(ce.ifFalse)) {
        rfEdges.push({
          id: `${ce.from}-false-${ce.ifFalse}`,
          source: ce.from,
          target: ce.ifFalse,
          animated: false,
          style: { stroke: 'var(--border)', strokeWidth: 1.5 }
        })
      }
    }
  }

  return { workflowType, nodes: rfNodes, edges: rfEdges, rounds, hasSynthesis }
}

function nodeKindToRfType(node: PlanNode): string {
  if (node.kind === 'synthesizer') return 'synthesisNode'
  if (node.kind === 'auditor') return 'auditNode'
  return 'agentNode'
}

// ─── Dagre layout (used by custom, solo fallback) ─────────────────────────────

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 90, marginx: 20, marginy: 20 })

  for (const node of nodes) {
    if (node.type === 'roundLabel') continue
    const w = (node.measured?.width as number | undefined) ?? (node.width as number | undefined) ?? AGENT_NODE_WIDTH
    const h = (node.measured?.height as number | undefined) ?? (node.height as number | undefined) ?? AGENT_NODE_HEIGHT
    g.setNode(node.id, { width: w, height: h })
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
    if (!pos) return node
    const w = (node.width as number | undefined) ?? AGENT_NODE_WIDTH
    const h = (node.height as number | undefined) ?? AGENT_NODE_HEIGHT
    return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } }
  })
}

// ─── Round-column label positioning ───────────────────────────────────────────

export function addRoundLabels(laidOutNodes: Node[], rounds: RoundMeta[]): Node[] {
  if (rounds.length <= 1) return laidOutNodes

  const result = [...laidOutNodes]

  for (const round of rounds) {
    const allRoundIds = new Set(round.agentNodeIds)
    const groupNodes = laidOutNodes.filter((n) => allRoundIds.has(n.id))
    if (groupNodes.length === 0) continue

    const minY = Math.min(...groupNodes.map((n) => n.position.y))
    const minX = Math.min(...groupNodes.map((n) => n.position.x))

    result.push({
      id: `round-label-${round.id}`,
      type: 'roundLabel',
      position: {
        x: minX,
        y: minY - ROUND_LABEL_HEIGHT - 12
      },
      data: { round: round.id, label: `Round ${round.id + 1}`, isActive: false } satisfies RoundLabelData,
      width: ROUND_LABEL_WIDTH,
      height: ROUND_LABEL_HEIGHT,
      selectable: false,
      draggable: false
    })
  }

  return result
}
