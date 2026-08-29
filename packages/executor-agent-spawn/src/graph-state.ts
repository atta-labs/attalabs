/**
 * @file graph-state.ts
 * @description This package's own LangGraph state annotation. Declared from
 * scratch rather than extended from `packages/adapter-langgraph`'s
 * `VadaGraphState` — that state is shaped for rounds-shaped Plans (transcript,
 * tool decisions, revision loops keyed by round). This state carries only
 * what an agent-lifecycle Plan's executor needs: a per-run identifier, each
 * node's resumable session id, and a per-node revision counter.
 */

import { Annotation } from '@langchain/langgraph'
import type { StepNodeResult } from './types'

/**
 * LangGraph state for executing a steps-shaped Plan.
 *
 * - `runId`: set once at graph start; correlates every event this run
 *   produces (engine-agent-spawn-v1 task 6 reads this).
 * - `results`: merged, keyed by node id — each node writes its own key, so
 *   parallel steps (a future shape) never clobber each other. The value is a
 *   union discriminated on `kind`: agent-spawn nodes record their event
 *   stream and session, mechanical nodes their exit code and output. Adding
 *   the second node kind widened this field's value type and left its reducer
 *   untouched — keyed merge is already the right one for per-node writes.
 * - `sessions`: merged, keyed by node id — the resumable session id a later
 *   step's `resume` field looks up. Only agent-spawn nodes ever write here;
 *   a mechanical node has no session to resume.
 * - `revisionCounts`: merged, keyed by node id — how many times that node's
 *   position has executed (1 on first run; a later retry/resume increments
 *   it). Not a rounds-style audit-revision counter — this shape has none.
 */
export const AgentSpawnGraphState = Annotation.Root({
  runId: Annotation<string>(),
  results: Annotation<Record<string, StepNodeResult>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  sessions: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  revisionCounts: Annotation<Record<string, number>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  })
})

/** Runtime type of the state object passed between this graph's nodes. */
export type AgentSpawnGraphStateValue = typeof AgentSpawnGraphState.State
