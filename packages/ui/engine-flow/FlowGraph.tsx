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
import type { FlowEventSource, FlowEvent, NodeVisualState } from './events'
import { planToVisualNodes } from './planToVisualNodes'
import { AgentNode } from './nodeRenderers/AgentNode'
import { SynthesisNode } from './nodeRenderers/SynthesisNode'
import { RoundLabel } from './nodeRenderers/RoundLabel'

const DEFAULT_NODE_TYPES: NodeTypes = {
  agentNode: AgentNode as ComponentType<NodeProps>,
  synthesisNode: SynthesisNode as ComponentType<NodeProps>,
  roundLabel: RoundLabel as ComponentType<NodeProps>
}

export interface FlowGraphProps {
  plan: Plan
  events?: FlowEventSource
  nodeRenderers?: {
    agent?: ComponentType<NodeProps>
    synthesis?: ComponentType<NodeProps>
  }
  className?: string
}

export function FlowGraph({ plan, events, nodeRenderers, className }: FlowGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => planToVisualNodes(plan), [plan])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [nodeStates, setNodeStates] = useState<Record<string, NodeVisualState>>({})
  const [streamingContents, setStreamingContents] = useState<Record<string, string>>({})
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set())

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      ...DEFAULT_NODE_TYPES,
      ...(nodeRenderers?.agent ? { agentNode: nodeRenderers.agent } : {}),
      ...(nodeRenderers?.synthesis ? { synthesisNode: nodeRenderers.synthesis } : {})
    }),
    [nodeRenderers]
  )

  const handleEvent = useCallback((event: FlowEvent) => {
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
      default:
        break
    }
  }, [])

  useEffect(() => {
    if (!events) return
    const unsubscribe = events.subscribe(handleEvent)
    return unsubscribe
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
        minZoom={0.15}
        maxZoom={2.5}
      >
        <Background color='var(--border)' gap={20} size={1} />
        <Controls className='!bg-card !border-border !shadow-none' />
      </ReactFlow>
    </div>
  )
}
