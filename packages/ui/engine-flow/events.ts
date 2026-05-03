export type { NodeVisualState } from './types'

export type FlowEvent =
  | { type: 'node:queued'; nodeId: string }
  | { type: 'node:start'; nodeId: string }
  | { type: 'node:streaming'; nodeId: string; content?: string }
  | { type: 'node:complete'; nodeId: string }
  | { type: 'node:revised'; nodeId: string }
  | { type: 'edge:activate'; from: string; to: string }
  | { type: 'round:start'; round: number }
  | { type: 'round:complete'; round: number }
  | { type: 'flow:complete' }

export interface FlowEventSource {
  subscribe(handler: (event: FlowEvent) => void): () => void
}
