'use client'

import { useMemo, useEffect, useCallback, useState } from 'react'
import type { ComponentType } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type NodeProps
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Plan } from '@atta/engine'
import { cn } from '@atta/ui/lib/utils'
import type { FlowEventSource, FlowEvent } from './events'
import type { FlowRendererSet, NodeVisualState, RoundLabelData } from './types'
import { planToVisualNodes } from './planToVisualNodes'
import { applyLayout } from './layouts'
import { AgentNode } from './nodeRenderers/AgentNode'
import { SynthesisNode } from './nodeRenderers/SynthesisNode'
import { RoundLabel } from './nodeRenderers/RoundLabel'
import { BriefNode } from './nodeRenderers/BriefNode'
import { AuditBadge } from './nodeRenderers/AuditBadge'

const BASE_NODE_TYPES: NodeTypes = {
  agentNode: AgentNode as ComponentType<NodeProps>,
  synthesisNode: SynthesisNode as ComponentType<NodeProps>,
  briefNode: BriefNode as ComponentType<NodeProps>,
  auditNode: AuditBadge as ComponentType<NodeProps>,
  roundLabel: RoundLabel as ComponentType<NodeProps>
}

export interface FlowGraphProps {
  plan: Plan
  events?: FlowEventSource
  rendererSet?: FlowRendererSet
  className?: string
}

export function FlowGraph({ plan, events, rendererSet, className }: FlowGraphProps) {
  const viz = useMemo(() => planToVisualNodes(plan), [plan])
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => applyLayout(viz), [viz])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [nodeStates, setNodeStates] = useState<Record<string, NodeVisualState>>({})
  const [streamingContents, setStreamingContents] = useState<Record<string, string>>({})
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set())

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      ...BASE_NODE_TYPES,
      ...(rendererSet?.agent ? { agentNode: rendererSet.agent.component } : {}),
      ...(rendererSet?.synthesis ? { synthesisNode: rendererSet.synthesis.component } : {}),
      ...(rendererSet?.brief ? { briefNode: rendererSet.brief.component } : {}),
      ...(rendererSet?.audit ? { auditNode: rendererSet.audit.component } : {})
    }),
    [rendererSet]
  )

  const handleEvent = useCallback(
    (event: FlowEvent) => {
      switch (event.type) {
        case 'node:queued':
          setNodeStates((prev) => ({ ...prev, [event.nodeId]: 'queued' }))
          break
        case 'node:start':
          setNodeStates((prev) => ({ ...prev, [event.nodeId]: 'running' }))
          break
        case 'node:streaming':
          setNodeStates((prev) => ({ ...prev, [event.nodeId]: 'streaming' }))
          if (event.content) {
            setStreamingContents((prev) => ({ ...prev, [event.nodeId]: event.content! }))
          }
          break
        case 'node:complete':
          setNodeStates((prev) => ({ ...prev, [event.nodeId]: 'complete' }))
          break
        case 'node:revised':
          setNodeStates((prev) => ({ ...prev, [event.nodeId]: 'revised' }))
          break
        case 'edge:activate': {
          const edgeId = `${event.from}-${event.to}`
          setActiveEdges((prev) => new Set([...prev, edgeId]))
          break
        }
        case 'round:start':
          setNodes((nds) =>
            nds.map((n) => {
              if (n.type !== 'roundLabel') return n
              const d = n.data as RoundLabelData
              return { ...n, data: { ...n.data, isActive: d.round === event.round } }
            })
          )
          break
        case 'round:complete':
          setNodes((nds) =>
            nds.map((n) => {
              if (n.type !== 'roundLabel') return n
              const d = n.data as RoundLabelData
              if (d.round === event.round) return { ...n, data: { ...n.data, isActive: false } }
              return n
            })
          )
          break
        default:
          break
      }
    },
    [setNodes]
  )

  useEffect(() => {
    if (!events) return
    return events.subscribe(handleEvent)
  }, [events, handleEvent])

  // Sync visual state into node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'roundLabel') return n
        const visualState = nodeStates[n.id] ?? 'idle'
        const streamingContent = streamingContents[n.id]
        return { ...n, data: { ...n.data, visualState, ...(streamingContent ? { streamingContent } : {}) } }
      })
    )
  }, [nodeStates, streamingContents, setNodes])

  // Animate activated edges
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: activeEdges.has(e.id),
        style: activeEdges.has(e.id) ? { ...e.style, stroke: 'var(--primary)', strokeWidth: 2 } : e.style
      }))
    )
  }, [activeEdges, setEdges])

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnScroll={true}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background color='var(--border)' gap={20} size={1} />
        <Controls className='!bg-card !border-border !shadow-none' />
      </ReactFlow>
    </div>
  )
}
