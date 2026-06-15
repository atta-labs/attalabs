'use client'

import {
  Background,
  type Edge,
  MarkerType,
  type Node,
  type NodeProps,
  ReactFlow,
  useEdgesState,
  useNodesState
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Dagre from '@dagrejs/dagre'
import type { Task } from '@atta/aeg-core'
import { cn } from '@atta/ui/lib/utils'
import { useMemo } from 'react'

const NODE_WIDTH = 220
const NODE_HEIGHT = 96
const CONTAINER_PADDING = 40

type TaskNodeData = {
  id: string
  title: string
  issue: number | null
  projects: string[]
  [key: string]: unknown
}

type TaskNode = Node<TaskNodeData, 'taskNode'>

function TaskNode({ data }: NodeProps<TaskNode>) {
  return (
    <div
      className={cn(
        'flex h-[96px] w-[220px] flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-card-foreground shadow-sm'
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='font-mono text-sm font-semibold text-foreground'>{data.id}</span>
        {data.issue !== null ? (
          <span className='font-mono text-[0.65rem] text-muted-foreground'>#{data.issue}</span>
        ) : null}
      </div>
      <p className='line-clamp-2 font-sans text-xs text-card-foreground/85'>{data.title}</p>
      {data.projects.length > 0 ? (
        <div className='mt-auto flex flex-wrap gap-1'>
          {data.projects.map((p) => (
            <span
              key={p}
              className='rounded-sm border border-border bg-muted/40 px-1.5 py-px font-mono text-[0.6rem] text-muted-foreground'
            >
              {p}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const nodeTypes = { taskNode: TaskNode }

/**
 * Build undirected dedup key for a conflicts-with pair so a pair declared on
 * both sides ({a→b, b→a}) renders as a single edge.
 */
function conflictKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function buildGraph(tasks: Task[]): { nodes: TaskNode[]; edges: Edge[] } {
  const known = new Set(tasks.map((t) => t.id))

  const rawNodes: TaskNode[] = tasks.map((task) => ({
    id: task.id,
    type: 'taskNode',
    position: { x: 0, y: 0 },
    data: {
      id: task.id,
      title: task.title,
      issue: task.issue,
      projects: task.projects
    },
    width: NODE_WIDTH,
    height: NODE_HEIGHT
  }))

  const edges: Edge[] = []

  // depends-on: directed arrow from the upstream task to the dependent task
  // (semantically "A depends on B" → B must complete before A → arrow B → A).
  for (const task of tasks) {
    for (const upstream of task.dependsOn) {
      if (!known.has(upstream)) continue
      edges.push({
        id: `dep-${upstream}-${task.id}`,
        source: upstream,
        target: task.id,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: 'var(--border)'
        },
        style: { stroke: 'var(--border)', strokeWidth: 1.5 }
      })
    }
  }

  // conflicts-with: dashed, undirected, deduped across symmetric pairs
  const conflictsSeen = new Set<string>()
  for (const task of tasks) {
    for (const other of task.conflictsWith) {
      if (!known.has(other)) continue
      if (other === task.id) continue
      const key = conflictKey(task.id, other)
      if (conflictsSeen.has(key)) continue
      conflictsSeen.add(key)
      edges.push({
        id: `conflict-${key}`,
        source: task.id,
        target: other,
        type: 'straight',
        style: {
          stroke: 'var(--warning)',
          strokeWidth: 1.25,
          strokeDasharray: '5,4',
          opacity: 0.85
        }
      })
    }
  }

  return { nodes: rawNodes, edges }
}

function applyDagreLayout(nodes: TaskNode[], edges: Edge[]): TaskNode[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 80, marginx: 20, marginy: 20 })

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  // Only use depends-on edges for ranking; conflicts-with are undirected and
  // would create false hierarchical pressure if fed into dagre.
  for (const edge of edges) {
    if (!edge.id.startsWith('dep-')) continue
    g.setEdge(edge.source, edge.target)
  }

  Dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    if (!pos) return node
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })
}

export interface TaskGraphProps {
  tasks: Task[]
  className?: string
}

export function TaskGraph({ tasks, className }: TaskGraphProps) {
  const {
    nodes: initialNodes,
    edges: initialEdges,
    viewportStyle
  } = useMemo(() => {
    const { nodes: raw, edges } = buildGraph(tasks)
    const laidOut = applyDagreLayout(raw, edges)
    if (laidOut.length === 0) {
      return { nodes: laidOut, edges, viewportStyle: null }
    }
    const minX = Math.min(...laidOut.map((n) => n.position.x))
    const minY = Math.min(...laidOut.map((n) => n.position.y))
    const maxX = Math.max(...laidOut.map((n) => n.position.x + NODE_WIDTH))
    const maxY = Math.max(...laidOut.map((n) => n.position.y + NODE_HEIGHT))
    const width = maxX - minX + CONTAINER_PADDING * 2
    const height = maxY - minY + CONTAINER_PADDING * 2
    return {
      nodes: laidOut,
      edges,
      viewportStyle: {
        containerStyle: { width, height } as React.CSSProperties,
        viewport: { x: CONTAINER_PADDING - minX, y: CONTAINER_PADDING - minY, zoom: 1 }
      }
    }
  }, [tasks])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  if (tasks.length === 0) {
    return (
      <p className='font-sans text-sm text-muted-foreground/70'>
        No tasks declared in this iteration's topology table.
      </p>
    )
  }

  return (
    <div className='overflow-x-auto rounded-lg border border-border bg-card'>
      <div className={cn('relative', className)} style={viewportStyle?.containerStyle}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          {...(viewportStyle ? { defaultViewport: viewportStyle.viewport } : { fitView: true })}
          proOptions={{ hideAttribution: true }}
          preventScrolling={false}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
        >
          <Background color='var(--border)' gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  )
}
