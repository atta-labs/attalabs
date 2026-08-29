export type { NodeVisualState } from './types'

// `runId` is optional on every node-scoped member so an existing producer
// (mockEventDriver.ts, which knows no run identifier) keeps typechecking
// unchanged — a producer that does have one (engine-agent-spawn-v1 task 6's
// executor) sets it so an observer can place the event within its enclosing
// run, not just against the bare node id.
export type FlowEvent =
  | { type: 'node:queued'; nodeId: string; runId?: string }
  | { type: 'node:start'; nodeId: string; runId?: string }
  | { type: 'node:streaming'; nodeId: string; runId?: string; content?: string }
  | { type: 'node:complete'; nodeId: string; runId?: string }
  | { type: 'node:revised'; nodeId: string; runId?: string }
  | { type: 'node:failed'; nodeId: string; runId?: string; error: string }
  | { type: 'edge:activate'; from: string; to: string }
  | { type: 'round:start'; round: number }
  | { type: 'round:complete'; round: number }
  | { type: 'flow:complete' }

export interface FlowEventSource {
  subscribe(handler: (event: FlowEvent) => void): () => void
}
